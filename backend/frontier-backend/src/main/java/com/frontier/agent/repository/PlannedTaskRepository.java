package com.frontier.agent.repository;

import com.frontier.agent.domain.PlannedTask;
import com.frontier.agent.domain.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface PlannedTaskRepository extends JpaRepository<PlannedTask, Long> {
    List<PlannedTask> findByStatus(TaskStatus status);
    List<PlannedTask> findByScheduledForBefore(Instant instant);
}
