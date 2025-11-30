package com.frontier.agent.clients.aws;

import java.net.URI;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.s3.S3AsyncClient;
import software.amazon.awssdk.services.sqs.SqsAsyncClient;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(AwsClientProperties.class)
public class AwsClientConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public SqsAsyncClient sqsAsyncClient(AwsClientProperties properties) {
        return SqsAsyncClient.builder()
                .region(Region.of(properties.getRegion()))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .endpointOverride(properties.getEndpointOverride())
                .build();
    }

    @Bean
    @ConditionalOnMissingBean
    public DynamoDbAsyncClient dynamoDbAsyncClient(AwsClientProperties properties) {
        return DynamoDbAsyncClient.builder()
                .region(Region.of(properties.getRegion()))
                .endpointOverride(properties.getEndpointOverride())
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }

    @Bean
    @ConditionalOnMissingBean
    public S3AsyncClient s3AsyncClient(AwsClientProperties properties) {
        return S3AsyncClient.builder()
                .region(Region.of(properties.getRegion()))
                .endpointOverride(properties.getEndpointOverride())
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }
}
