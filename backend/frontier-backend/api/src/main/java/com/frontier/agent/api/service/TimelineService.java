package com.frontier.agent.api.service;

import com.frontier.agent.clients.aws.DynamoProjectionWriter;
import com.frontier.agent.domain.model.TimelineEntry;
import com.frontier.agent.domain.repository.TimelineEntryRepository;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TimelineService {

    private final TimelineEntryRepository repository;
    private final DynamoProjectionWriter projectionWriter;

    public TimelineService(TimelineEntryRepository repository, DynamoProjectionWriter projectionWriter) {
        this.repository = repository;
        this.projectionWriter = projectionWriter;
    }

    @Transactional
    public TimelineEntry record(String userId, Instant occurredAt, String type, UUID entryId, String metadata) {
        TimelineEntry entry = new TimelineEntry();
        entry.setUserId(userId);
        entry.setOccurredAt(occurredAt);
        entry.setEntryType(type);
        entry.setEntryId(entryId);
        entry.setMetadata(metadata);
        var saved = repository.save(entry);
        projectionWriter.writeTimelineEntry("timeline_feed", userId, occurredAt, type, entryId.toString(), metadata);
        return saved;
    }
}
