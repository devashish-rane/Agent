package com.frontier.agent.api.dto;

import jakarta.validation.constraints.NotBlank;

public record NoteRequest(@NotBlank String userId, @NotBlank String content, String type, String occurredAt) {
}
