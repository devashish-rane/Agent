package com.frontier.agent.clients.aws;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;

@Component
public class DynamoProjectionWriter {

    private static final Logger log = LoggerFactory.getLogger(DynamoProjectionWriter.class);

    private final DynamoDbAsyncClient dynamoDbAsyncClient;

    public DynamoProjectionWriter(DynamoDbAsyncClient dynamoDbAsyncClient) {
        this.dynamoDbAsyncClient = dynamoDbAsyncClient;
    }

    public CompletableFuture<Void> writeTimelineEntry(String table, String userId, Instant occurredAt, String entryType, String entryId, String metadata) {
        var item = Map.of(
                "user_id", AttributeValue.fromS(userId),
                "sort_key", AttributeValue.fromS(String.format("%s#%s", occurredAt.toString(), entryType)),
                "entry_id", AttributeValue.fromS(entryId),
                "metadata", AttributeValue.fromS(metadata == null ? "{}" : metadata));
        var request = PutItemRequest.builder().tableName(table).item(item).build();
        return dynamoDbAsyncClient.putItem(request)
                .whenComplete((result, throwable) -> {
                    if (throwable != null) {
                        log.warn("Failed to project timeline entry {}", entryId, throwable);
                    }
                })
                .thenApply(ignore -> null);
    }
}
