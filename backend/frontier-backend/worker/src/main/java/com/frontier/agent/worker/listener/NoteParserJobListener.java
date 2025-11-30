package com.frontier.agent.worker.listener;

import com.frontier.agent.clients.debug.S3DebugCapsuleWriter;
import com.frontier.agent.domain.model.AgentRun;
import com.frontier.agent.domain.model.Note;
import com.frontier.agent.domain.repository.AgentRunRepository;
import com.frontier.agent.domain.repository.NoteRepository;
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
public class NoteParserJobListener {

    private static final Logger log = LoggerFactory.getLogger(NoteParserJobListener.class);

    private final NoteRepository noteRepository;
    private final AgentRunRepository agentRunRepository;
    private final IdempotencyService idempotencyService;
    private final S3DebugCapsuleWriter capsuleWriter;

    public NoteParserJobListener(
            NoteRepository noteRepository,
            AgentRunRepository agentRunRepository,
            IdempotencyService idempotencyService,
            S3DebugCapsuleWriter capsuleWriter) {
        this.noteRepository = noteRepository;
        this.agentRunRepository = agentRunRepository;
        this.idempotencyService = idempotencyService;
        this.capsuleWriter = capsuleWriter;
    }

    @SqsListener(value = "note-parser-queue")
    public void handle(Map<String, Object> payload, @Header(name = "correlation_id", required = false) String correlationId) {
        String bodyHash = Integer.toHexString(payload.toString().hashCode());
        String idempotencyKey = "note-parser-" + bodyHash;
        if (!idempotencyService.tryAcquire(idempotencyKey, "NoteParserAgent", java.time.Duration.ofHours(1))) {
            log.info("duplicate note parser invocation skipped for key {}", idempotencyKey);
            return;
        }
        AgentRun run = new AgentRun();
        run.setAgentName("NoteParserAgent");
        run.setCorrelationId(correlationId != null ? correlationId : UUID.randomUUID().toString());
        run.setInputHash(bodyHash);
        run.setStatus("STARTED");
        run.setStartedAt(Instant.now());
        agentRunRepository.save(run);

        try {
            Note note = new Note();
            note.setUserId((String) payload.get("user_id"));
            note.setContent((String) payload.getOrDefault("content", ""));
            noteRepository.save(note);
            run.setStatus("SUCCEEDED");
        } catch (Exception ex) {
            log.error("Note parsing failed", ex);
            run.setStatus("FAILED");
            run.setLastError(ex.getMessage());
            capsuleWriter.write("debug-capsules", idempotencyKey + ".json", payload);
        } finally {
            run.setFinishedAt(Instant.now());
            agentRunRepository.save(run);
        }
    }
}
