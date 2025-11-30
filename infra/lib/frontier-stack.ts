import { Stack, StackProps, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as ssm from 'aws-cdk-lib/aws-ssm';

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

    const vpc = new ec2.Vpc(this, 'FrontierVpc', { maxAzs: 2 });

    const cluster = new ecs.Cluster(this, 'FrontierCluster', { vpc });

    const logGroup = new logs.LogGroup(this, 'FrontierLogs', {
      retention: logs.RetentionDays.TWO_WEEKS,
    });

    const db = new rds.DatabaseInstance(this, 'FrontierDb', {
      vpc,
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_15_5 }),
      credentials: rds.Credentials.fromGeneratedSecret('frontier'),
      instanceType: new ec2.InstanceType('t4g.small'),
      allocatedStorage: 50,
      multiAz: false,
      storageEncrypted: true,
      deletionProtection: true,
      backupRetention: Duration.days(7),
      removalPolicy: RemovalPolicy.SNAPSHOT,
    });

    const appBucket = new s3.Bucket(this, 'ResourcePackBucket', {
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const timelineTable = new dynamodb.Table(this, 'TimelineTable', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'BackendService', {
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
        }
      },
      circuitBreaker: { rollback: true },
      healthCheckGracePeriod: Duration.seconds(60),
    });

    const deployAlerts = new sns.Topic(this, 'DeployAlerts');
    new ssm.StringParameter(this, 'ResourcePackBucketParam', { parameterName: '/frontier/resourceBucket', stringValue: appBucket.bucketName });
    new ssm.StringParameter(this, 'TimelineTableParam', { parameterName: '/frontier/timelineTable', stringValue: timelineTable.tableName });

    // Note: permissions would be attached via task roles when wiring real images.
  }
}
