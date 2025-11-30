package com.frontier.agent.repository;

import com.frontier.agent.domain.BehaviorSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface BehaviorSnapshotRepository extends JpaRepository<BehaviorSnapshot, Long> {
    List<BehaviorSnapshot> findByCapturedAtAfter(Instant cutoff);
}
