package com.frontier.agent.api.dto;

import jakarta.validation.constraints.NotBlank;

public record GoalRequest(@NotBlank String userId, @NotBlank String title, String description, String dueAt) {
}
