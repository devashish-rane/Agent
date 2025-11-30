package com.frontier.agent.domain.repository;

import com.frontier.agent.domain.model.Snapshot;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SnapshotRepository extends JpaRepository<Snapshot, UUID> {
    List<Snapshot> findByUserId(String userId);
}
