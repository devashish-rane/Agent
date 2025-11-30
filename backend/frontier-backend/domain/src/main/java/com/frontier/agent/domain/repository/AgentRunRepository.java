package com.frontier.agent.domain.repository;

import com.frontier.agent.domain.model.AgentRun;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentRunRepository extends JpaRepository<AgentRun, UUID> {
    Optional<AgentRun> findFirstByCorrelationIdAndAgentNameOrderByCreatedAtDesc(String correlationId, String agentName);
}
