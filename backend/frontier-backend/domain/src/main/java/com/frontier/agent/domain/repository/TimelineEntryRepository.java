package com.frontier.agent.domain.repository;

import com.frontier.agent.domain.model.TimelineEntry;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TimelineEntryRepository extends JpaRepository<TimelineEntry, UUID> {
    List<TimelineEntry> findByUserId(String userId);
}
