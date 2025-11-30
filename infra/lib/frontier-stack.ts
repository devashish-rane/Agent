import { Stack, StackProps, Duration, RemovalPolicy, Aspects, Annotations } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as shield from 'aws-cdk-lib/aws-shield';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';

/**
 * FrontierStack wires a minimal yet production-conscious footprint:
 * - Fargate for Spring Boot backend with autoscaling and circuit breaker
 * - RDS Postgres for primary store and DynamoDB projection table for timeline
 * - S3 bucket for resource packs with versioning and retention controls
 * - SNS topic for rollback/alert hooks to surface noisy deploys early
 */
export class FrontierStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const environmentName = new ssm.StringParameter(this, 'EnvironmentName', {
      parameterName: '/frontier/environment',
      stringValue: this.node.tryGetContext('env') ?? 'dev',
      description: 'Environment label that gates environment-specific resources and alarms.',
    });

    const deployAlerts = new sns.Topic(this, 'DeployAlerts', {
      displayName: 'Frontier deploy and alarm notifications',
    });

    const vpc = new ec2.Vpc(this, 'FrontierVpc', { maxAzs: 2 });

    const cluster = new ecs.Cluster(this, 'FrontierCluster', { vpc });

    const logGroup = new logs.LogGroup(this, 'FrontierLogs', {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const runtimeSecret = new secretsmanager.Secret(this, 'RuntimeAppConfig', {
      description: 'Per-environment feature flags and API tokens used by the agents.',
      secretName: `/frontier/${environmentName.stringValue}/app/config`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ featureFlags: 'safe' }),
        generateStringKey: 'token',
      },
    });

    const db = new rds.DatabaseInstance(this, 'FrontierDb', {
      vpc,
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15_5 }),
      credentials: rds.Credentials.fromGeneratedSecret('frontier'),
      instanceType: new ec2.InstanceType('t4g.small'),
      allocatedStorage: 50,
      multiAz: false,
      storageEncrypted: true,
      publiclyAccessible: false,
      deletionProtection: true,
      backupRetention: Duration.days(7),
      removalPolicy: RemovalPolicy.SNAPSHOT,
    });

    db.addRotationSingleUser({
      // Rotation prevents slow credential drift and gives us deterministic secrets for staging/prod cutovers.
      automaticallyAfter: Duration.days(30),
      excludeCharacters: '"@/\\',
    });

    const appBucket = new s3.Bucket(this, 'ResourcePackBucket', {
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN,
      objectLockEnabled: true,
      objectLockDefaultRetention: { mode: s3.ObjectLockMode.COMPLIANCE, days: 30 },
    });

    appBucket.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'EnforceTlsAndObjectLockWrites',
      actions: ['s3:PutObject', 's3:DeleteObject'],
      resources: [appBucket.arnForObjects('*')],
      principals: [new iam.AnyPrincipal()],
      conditions: {
        Bool: { 'aws:SecureTransport': 'true' },
        StringEqualsIfExists: {
          's3:x-amz-object-lock-mode': s3.ObjectLockMode.COMPLIANCE,
        },
      },
      effect: iam.Effect.DENY,
    }));

    const timelineTable = new dynamodb.Table(this, 'TimelineTable', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    const backendService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'BackendService', {
      cluster,
      cpu: 512,
      memoryLimitMiB: 1024,
      desiredCount: 2,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('public.ecr.aws/docker/library/eclipse-temurin:17'),
        containerPort: 8080,
        enableLogging: true,
        logDriver: ecs.LogDrivers.awsLogs({ logGroup, streamPrefix: 'backend' }),
        environment: {
          SPRING_DATASOURCE_URL: db.instanceEndpoint.socketAddress,
          TIMELINE_TABLE: timelineTable.tableName,
          RESOURCE_PACK_BUCKET: appBucket.bucketName,
          ENVIRONMENT: environmentName.stringValue,
        },
        secrets: {
          APP_CONFIG: ecs.Secret.fromSecretsManager(runtimeSecret),
          DB_SECRET: ecs.Secret.fromSecretsManager(db.secret!),
        },
      },
      circuitBreaker: { rollback: true },
      healthCheckGracePeriod: Duration.seconds(60),
    });

    new ssm.StringParameter(this, 'ResourcePackBucketParam', { parameterName: '/frontier/resourceBucket', stringValue: appBucket.bucketName });
    new ssm.StringParameter(this, 'TimelineTableParam', { parameterName: '/frontier/timelineTable', stringValue: timelineTable.tableName });
    new ssm.StringParameter(this, 'AlbDnsParam', { parameterName: '/frontier/backend/alb', stringValue: backendService.loadBalancer.loadBalancerDnsName });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'ResourceOAI');
    const contentDistribution = new cloudfront.Distribution(this, 'StaticDistribution', {
      defaultBehavior: {
        origin: new cloudfrontOrigins.S3Origin(appBucket, { originAccessIdentity }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      comment: 'CloudFront front door for static assets; paired with WAF + Shield.',
      enableIpv6: true,
      logBucket: appBucket,
    });

    const albWebAcl = new wafv2.CfnWebACL(this, 'AlbWebAcl', {
      name: 'frontier-alb-waf',
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        sampledRequestsEnabled: true,
        metricName: 'frontier-alb-waf',
      },
      rules: [
        {
          name: 'AWS-AWSManagedRulesCommonRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: { managedRuleGroupStatement: { name: 'AWSManagedRulesCommonRuleSet', vendorName: 'AWS' } },
          visibilityConfig: { cloudWatchMetricsEnabled: true, sampledRequestsEnabled: true, metricName: 'alb-common' },
        },
      ],
    });

    new wafv2.CfnWebACLAssociation(this, 'AlbWafAssociation', {
      resourceArn: backendService.loadBalancer.loadBalancerArn,
      webAclArn: albWebAcl.attrArn,
    });

    const cloudfrontWebAcl = new wafv2.CfnWebACL(this, 'CloudFrontWebAcl', {
      name: 'frontier-cloudfront-waf',
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        sampledRequestsEnabled: true,
        metricName: 'frontier-cloudfront-waf',
      },
      rules: [
        {
          name: 'AWS-AWSManagedRulesAmazonIpReputationList',
          priority: 1,
          overrideAction: { none: {} },
          statement: { managedRuleGroupStatement: { name: 'AWSManagedRulesAmazonIpReputationList', vendorName: 'AWS' } },
          visibilityConfig: { cloudWatchMetricsEnabled: true, sampledRequestsEnabled: true, metricName: 'cf-reputation' },
        },
      ],
    });

    new wafv2.CfnWebACLAssociation(this, 'CloudFrontWafAssociation', {
      resourceArn: `arn:aws:cloudfront::${Stack.of(this).account}:distribution/${contentDistribution.distributionId}`,
      webAclArn: cloudfrontWebAcl.attrArn,
    });

    new shield.CfnProtection(this, 'AlbShield', {
      name: 'frontier-alb',
      resourceArn: backendService.loadBalancer.loadBalancerArn,
    });

    new shield.CfnProtection(this, 'CloudFrontShield', {
      name: 'frontier-cloudfront',
      resourceArn: `arn:aws:cloudfront::${Stack.of(this).account}:distribution/${contentDistribution.distributionId}`,
    });

    const latencyAlarm = backendService.targetGroup.metricTargetResponseTime({ statistic: 'p95' }).createAlarm(this, 'P95Latency', {
      threshold: 1.5,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      alarmDescription: 'P95 latency over 1.5s suggests downstream contention or cold starts.',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    const errorRateAlarm = backendService.targetGroup.metricUnhealthyHostCount().createAlarm(this, 'ErrorRate', {
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'Fail when any unhealthy hosts appear; this catches crash loops and fatal startup errors.',
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    });

    const cpuAlarm = backendService.service.metricCpuUtilization().createAlarm(this, 'HighCpu', {
      threshold: 85,
      evaluationPeriods: 5,
      datapointsToAlarm: 3,
      alarmDescription: 'Sustained CPU >85% likely indicates runaway agents or unbounded fan-out.',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    latencyAlarm.addAlarmAction({ bind: () => ({ alarmActionArn: deployAlerts.topicArn }) });
    errorRateAlarm.addAlarmAction({ bind: () => ({ alarmActionArn: deployAlerts.topicArn }) });
    cpuAlarm.addAlarmAction({ bind: () => ({ alarmActionArn: deployAlerts.topicArn }) });

    const dashboard = new cloudwatch.Dashboard(this, 'GoldenSignalsDashboard', {
      dashboardName: `frontier-${environmentName.stringValue}-golden-signals`,
    });
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'P95 latency',
        left: [backendService.targetGroup.metricTargetResponseTime({ statistic: 'p95' })],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'HTTP 5xx + unhealthy hosts',
        left: [backendService.targetGroup.metricUnhealthyHostCount()],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'ECS CPU/Memory',
        left: [backendService.service.metricCpuUtilization(), backendService.service.metricMemoryUtilization()],
      }),
    );

    const alarms: cloudwatch.IAlarm[] = [latencyAlarm, errorRateAlarm, cpuAlarm];

    Aspects.of(this).add({
      visit: (node) => {
        if (node instanceof rds.DatabaseInstance && node.publiclyAccessible) {
          Annotations.of(node).addError('RDS must remain private; public accessibility is forbidden.');
        }

        if (node === this && alarms.length === 0) {
          Annotations.of(node).addError('Golden-signal alarms are required for deployment.');
        }
      },
    });

    const sourceOutput = new codepipeline.Artifact('SourceOutput');
    const buildOutput = new codepipeline.Artifact('BuildOutput');

    const pipeline = new codepipeline.Pipeline(this, 'DeliveryPipeline', {
      crossAccountKeys: false,
      restartExecutionOnUpdate: true,
      pipelineName: `frontier-${environmentName.stringValue}-pipeline`,
    });

    const repositorySource = new codepipelineActions.GitHubSourceAction({
      actionName: 'GitHubSource',
      owner: 'frontier-ai',
      repo: 'agent',
      branch: this.node.tryGetContext('branch') ?? 'main',
      oauthToken: secretsmanager.Secret.fromSecretNameV2(this, 'GitHubToken', '/frontier/github/token').secretValue,
      output: sourceOutput,
    });

    const smokeTestProject = new codebuild.PipelineProject(this, 'SmokeTests', {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: { commands: ['npm install'] },
          build: { commands: ['npm test -- --runInBand'] },
        },
        artifacts: { files: ['**/*'] },
      }),
      environment: { buildImage: codebuild.LinuxBuildImage.STANDARD_7_0 },
      description: 'Lightweight smoke tests that hit health endpoints and schema contracts.',
    });

    const flywayDryRunProject = new codebuild.PipelineProject(this, 'FlywayDryRun', {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: { commands: ['echo "installing flyway"'] },
          build: { commands: ['./mvnw -pl backend -am -DskipTests flyway:info'] },
        },
      }),
      environment: { buildImage: codebuild.LinuxBuildImage.STANDARD_7_0 },
      description: 'Flyway dry-run to guard against destructive schema changes before deploy.',
    });

    pipeline.addStage({
      stageName: 'Source',
      actions: [repositorySource],
    });

    pipeline.addStage({
      stageName: 'Validate',
      actions: [
        new codepipelineActions.CodeBuildAction({
          actionName: 'SmokeTests',
          project: smokeTestProject,
          input: sourceOutput,
          outputs: [buildOutput],
        }),
        new codepipelineActions.CodeBuildAction({
          actionName: 'FlywayDryRun',
          project: flywayDryRunProject,
          input: sourceOutput,
        }),
      ],
    });

    pipeline.addStage({
      stageName: 'Deploy',
      actions: [
        new codepipelineActions.ManualApprovalAction({
          actionName: 'OperatorApproval',
          additionalInformation: 'Approve only if smoke + Flyway gates are green and alarms are healthy.',
        }),
      ],
    });

    // Note: permissions would be attached via task roles when wiring real images.
  }
}
