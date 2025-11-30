package com.frontier.agent.worker.listener;

import com.frontier.agent.clients.debug.S3DebugCapsuleWriter;
import com.frontier.agent.domain.model.AgentRun;
import com.frontier.agent.domain.model.Goal;
import com.frontier.agent.domain.repository.AgentRunRepository;
import com.frontier.agent.domain.repository.GoalRepository;
import com.frontier.agent.domain.service.IdempotencyService;
import io.awspring.cloud.sqs.annotation.SqsListener;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

@Component
public class GoalPlannerJobListener {

    private static final Logger log = LoggerFactory.getLogger(GoalPlannerJobListener.class);

    private final GoalRepository goalRepository;
    private final AgentRunRepository agentRunRepository;
    private final IdempotencyService idempotencyService;
    private final S3DebugCapsuleWriter capsuleWriter;

    public GoalPlannerJobListener(
            GoalRepository goalRepository,
            AgentRunRepository agentRunRepository,
            IdempotencyService idempotencyService,
            S3DebugCapsuleWriter capsuleWriter) {
        this.goalRepository = goalRepository;
        this.agentRunRepository = agentRunRepository;
        this.idempotencyService = idempotencyService;
        this.capsuleWriter = capsuleWriter;
    }

    @SqsListener(value = "goal-planner-queue")
    public void handle(Map<String, Object> payload, @Header(name = "correlation_id", required = false) String correlationId) {
        String bodyHash = Integer.toHexString(payload.toString().hashCode());
        String idempotencyKey = "goal-planner-" + bodyHash;
        if (!idempotencyService.tryAcquire(idempotencyKey, "GoalPlanner", java.time.Duration.ofHours(2))) {
            log.info("duplicate goal planner invocation skipped for key {}", idempotencyKey);
            return;
        }
        AgentRun run = new AgentRun();
        run.setAgentName("GoalPlannerAgent");
        run.setCorrelationId(correlationId != null ? correlationId : UUID.randomUUID().toString());
        run.setInputHash(bodyHash);
        run.setStatus("STARTED");
        run.setStartedAt(Instant.now());
        agentRunRepository.save(run);

        try {
            Goal goal = goalRepository.findById(UUID.fromString((String) payload.get("goal_id")))
                    .orElseThrow();
            goal.setPlanId(UUID.randomUUID());
            goalRepository.save(goal);
            run.setStatus("SUCCEEDED");
        } catch (Exception ex) {
            log.error("Goal planning failed", ex);
            run.setStatus("FAILED");
            run.setLastError(ex.getMessage());
            capsuleWriter.write("debug-capsules", idempotencyKey + ".json", payload);
        } finally {
            run.setFinishedAt(Instant.now());
            agentRunRepository.save(run);
        }
    }
}
