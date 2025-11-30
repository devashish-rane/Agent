package com.frontier.agent.service;

import com.frontier.agent.domain.Goal;
import com.frontier.agent.domain.PlannedTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * DynamoTimelineService mirrors critical plan facts into DynamoDB for low-latency UI reads.
 * The service emits idempotent writes keyed by goal/task IDs so reruns during retries do not
 * create divergent timelines.
 */
@Service
public class DynamoTimelineService {
    private static final Logger log = LoggerFactory.getLogger(DynamoTimelineService.class);

    private final DynamoDbClient dynamoDbClient;
    private final String tableName;

    public DynamoTimelineService(DynamoDbClient dynamoDbClient) {
        this.dynamoDbClient = dynamoDbClient;
        this.tableName = System.getenv().getOrDefault("TIMELINE_TABLE", "frontier-timeline");
    }

    public void projectGoal(Goal goal) {
        Map<String, String> item = new HashMap<>();
        item.put("pk", "GOAL#" + goal.getId());
        item.put("sk", "META");
        item.put("title", goal.getTitle());
        item.put("status", goal.getStatus().name());
        item.put("deadline", goal.getDeadline() != null ? goal.getDeadline().toString() : "");
        put(item);
    }

    public void projectTask(PlannedTask task) {
        Map<String, String> item = new HashMap<>();
        item.put("pk", "GOAL#" + (task.getGoal() != null ? task.getGoal().getId() : "NA"));
        item.put("sk", "TASK#" + task.getId());
        item.put("title", task.getTitle());
        item.put("status", task.getStatus().name());
        item.put("scheduledFor", task.getScheduledFor() != null ? task.getScheduledFor().toString() : "");
        item.put("writtenAt", Instant.now().toString());
        put(item);
    }

    private void put(Map<String, String> item) {
        Map<String, software.amazon.awssdk.services.dynamodb.model.AttributeValue> mapped = new HashMap<>();
        item.forEach((k, v) -> mapped.put(k, software.amazon.awssdk.services.dynamodb.model.AttributeValue.builder().s(v).build()));
        dynamoDbClient.putItem(PutItemRequest.builder().tableName(tableName).item(mapped).build());
        log.debug("Projected item {} to Dynamo timeline table {}", item, tableName);
    }
}
