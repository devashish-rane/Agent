package com.frontier.agent.domain;

/**
 * Lifecycle of a goal. We keep the set small to reduce branching and simplify
 * downstream projections (e.g., Dynamo timelines) that prefer predictable enums.
 */
public enum GoalStatus {
    ACTIVE,
    PAUSED,
    COMPLETED,
    ARCHIVED
}
