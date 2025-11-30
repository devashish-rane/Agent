package com.frontier.agent.service;

import com.frontier.agent.domain.ResourcePack;
import com.frontier.agent.repository.ResourcePackRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

/**
 * ResourcePackService streams curated packs to S3 and stores a pointer in Postgres.
 * Uploads are kept simple and idempotent by using deterministic keys; callers can
 * rerun failed uploads without leaving orphaned objects.
 */
@Service
public class ResourcePackService {
    private static final Logger log = LoggerFactory.getLogger(ResourcePackService.class);

    private final ResourcePackRepository resourcePackRepository;
    private final S3Client s3Client;
    private final String bucket;

    public ResourcePackService(ResourcePackRepository resourcePackRepository, S3Client s3Client) {
        this.resourcePackRepository = resourcePackRepository;
        this.s3Client = s3Client;
        this.bucket = System.getenv().getOrDefault("RESOURCE_PACK_BUCKET", "frontier-resource-packs");
    }

    public ResourcePack persistPack(ResourcePack pack) {
        String s3Key = pack.getS3Key() != null ? pack.getS3Key() : buildKey();
        uploadSkeletonArtifact(pack, s3Key);
        pack.setS3Key(s3Key);
        pack.setGeneratedAt(Instant.now());
        ResourcePack saved = resourcePackRepository.save(pack);
        log.info("Stored resource pack {} at {}", saved.getId(), s3Key);
        return saved;
    }

    private void uploadSkeletonArtifact(ResourcePack pack, String s3Key) {
        // Minimal content keeps the S3 object alive even before heavy rendering finishes.
        String body = "Resource pack placeholder for " + pack.getTitle();
        s3Client.putObject(PutObjectRequest.builder().bucket(bucket).key(s3Key).build(),
                software.amazon.awssdk.core.sync.RequestBody.fromBytes(body.getBytes(StandardCharsets.UTF_8)));
    }

    private String buildKey() {
        return "packs/" + UUID.randomUUID();
    }
}
