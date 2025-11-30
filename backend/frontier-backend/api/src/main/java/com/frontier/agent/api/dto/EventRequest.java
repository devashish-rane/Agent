package com.frontier.agent.api.dto;

import jakarta.validation.constraints.NotBlank;

public record EventRequest(@NotBlank String userId, @NotBlank String name, String description, @NotBlank String scheduledAt) {
}
