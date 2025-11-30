package com.frontier.agent.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "rca_record")
public class RcaRecord extends AuditableEntity {

    @Column(nullable = false)
    private UUID taskId;

    @Column(nullable = false)
    private String hypothesis;

    @Column(columnDefinition = "jsonb")
    private String evidence;

    @Column(columnDefinition = "jsonb")
    private String recommendedFix;

    public UUID getTaskId() {
        return taskId;
    }

    public void setTaskId(UUID taskId) {
        this.taskId = taskId;
    }

    public String getHypothesis() {
        return hypothesis;
    }

    public void setHypothesis(String hypothesis) {
        this.hypothesis = hypothesis;
    }

    public String getEvidence() {
        return evidence;
    }

    public void setEvidence(String evidence) {
        this.evidence = evidence;
    }

    public String getRecommendedFix() {
        return recommendedFix;
    }

    public void setRecommendedFix(String recommendedFix) {
        this.recommendedFix = recommendedFix;
    }
}
