package com.frontier.agent.domain;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * ResourcePack stores curated links and metadata. Artifacts live in S3; this
 * record keeps immutable pointers so we can rehydrate after a rollback.
 */
@Entity
@Table(name = "resource_packs")
public class ResourcePack {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String summary;

    /** S3 key where the bundled attachments or compiled PDF is stored. */
    private String s3Key;

    private Instant generatedAt = Instant.now();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getS3Key() {
        return s3Key;
    }

    public void setS3Key(String s3Key) {
        this.s3Key = s3Key;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(Instant generatedAt) {
        this.generatedAt = generatedAt;
    }
}
