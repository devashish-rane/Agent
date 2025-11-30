package com.frontier.agent.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * Deterministic key used by SQS consumers to short-circuit duplicate deliveries. Stored
 * in Postgres to keep worker behavior observable and in DynamoDB via the projection
 * writer for quick lookups in degraded states.
 */
@Entity
@Table(name = "idempotency_key")
public class IdempotencyKey {

    @Id
    private String id;

    @Column(nullable = false)
    private String owner;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public IdempotencyKey() {
    }

    public IdempotencyKey(String id, String owner) {
        this.id = id;
        this.owner = owner;
    }

    public String getId() {
        return id;
    }

    public String getOwner() {
        return owner;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
