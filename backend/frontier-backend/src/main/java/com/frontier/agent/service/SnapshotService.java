package com.frontier.agent.service;

import com.frontier.agent.domain.BehaviorSnapshot;
import com.frontier.agent.repository.BehaviorSnapshotRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * SnapshotService aggregates fast-moving execution metrics into compact
 * snapshots. We bias toward append-only writes to maintain a reliable audit trail
 * and to make incident investigation easier when planners misbehave.
 */
@Service
public class SnapshotService {
    private static final Logger log = LoggerFactory.getLogger(SnapshotService.class);

    private final BehaviorSnapshotRepository behaviorSnapshotRepository;

    public SnapshotService(BehaviorSnapshotRepository behaviorSnapshotRepository) {
        this.behaviorSnapshotRepository = behaviorSnapshotRepository;
    }

    public BehaviorSnapshot recordSnapshot(BehaviorSnapshot snapshot) {
        log.info("Recording snapshot with {} completed tasks", snapshot.getTasksCompleted());
        return behaviorSnapshotRepository.save(snapshot);
    }

    public List<BehaviorSnapshot> recentSnapshots() {
        Instant cutoff = Instant.now().minus(2, ChronoUnit.DAYS);
        return behaviorSnapshotRepository.findByCapturedAtAfter(cutoff);
    }
}
