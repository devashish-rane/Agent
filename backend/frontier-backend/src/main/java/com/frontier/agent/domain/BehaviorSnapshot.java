package com.frontier.agent.domain;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * BehaviorSnapshot stores 48-hour insights to keep plans adaptive even if
 * the analytics workers are temporarily unavailable. JSON fields capture
 * model outputs without forcing frequent schema migrations.
 */
@Entity
@Table(name = "behavior_snapshots")
public class BehaviorSnapshot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Instant capturedAt = Instant.now();

    @Column(length = 1024)
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String detailsJson;

    private int tasksCompleted;

    private int tasksScheduled;

    private int cognitiveLoadScore;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Instant getCapturedAt() {
        return capturedAt;
    }

    public void setCapturedAt(Instant capturedAt) {
        this.capturedAt = capturedAt;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getDetailsJson() {
        return detailsJson;
    }

    public void setDetailsJson(String detailsJson) {
        this.detailsJson = detailsJson;
    }

    public int getTasksCompleted() {
        return tasksCompleted;
    }

    public void setTasksCompleted(int tasksCompleted) {
        this.tasksCompleted = tasksCompleted;
    }

    public int getTasksScheduled() {
        return tasksScheduled;
    }

    public void setTasksScheduled(int tasksScheduled) {
        this.tasksScheduled = tasksScheduled;
    }

    public int getCognitiveLoadScore() {
        return cognitiveLoadScore;
    }

    public void setCognitiveLoadScore(int cognitiveLoadScore) {
        this.cognitiveLoadScore = cognitiveLoadScore;
    }
}
