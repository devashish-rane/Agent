package com.frontier.agent.clients.debug;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.async.AsyncRequestBody;
import software.amazon.awssdk.services.s3.S3AsyncClient;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * Ships “debug capsules” to S3 so incidents can be reproduced without re-running
 * expensive inference. Capsules include correlation IDs, agent names, and a schema
 * version to make triage deterministic.
 */
@Component
public class S3DebugCapsuleWriter {

    private static final Logger log = LoggerFactory.getLogger(S3DebugCapsuleWriter.class);
    private static final ObjectMapper mapper = new ObjectMapper();

    private final S3AsyncClient s3Client;

    public S3DebugCapsuleWriter(S3AsyncClient s3Client) {
        this.s3Client = s3Client;
    }

    public CompletableFuture<Void> write(String bucket, String key, Map<String, Object> payload) {
        try {
            var serialized = mapper.writeValueAsString(payload);
            var request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType("application/json")
                    .metadata(Map.of(
                            "correlation_id", MDC.getOrDefault("X-Correlation-Id", "unknown"),
                            "schema_version", "v1",
                            "created_at", Instant.now().toString()))
                    .build();
            return s3Client.putObject(request, AsyncRequestBody.fromString(serialized, StandardCharsets.UTF_8))
                    .whenComplete((result, throwable) -> {
                        if (throwable != null) {
                            log.error("Failed to persist debug capsule {}", key, throwable);
                        } else {
                            log.info("Capsule {} uploaded with version {}", key, result.versionId());
                        }
                    })
                    .thenApply(ignore -> null);
        } catch (Exception ex) {
            log.error("Unable to serialize debug capsule {}", key, ex);
            return CompletableFuture.completedFuture(null);
        }
    }
}
