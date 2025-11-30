package com.frontier.agent.domain;

/**
 * TaskStatus keeps planning and live nudges honest; we avoid creative labels
 * to make analytic rollups predictable across Postgres and Dynamo projections.
 */
public enum TaskStatus {
    PLANNED,
    IN_PROGRESS,
    BLOCKED,
    DONE,
    SKIPPED
}
