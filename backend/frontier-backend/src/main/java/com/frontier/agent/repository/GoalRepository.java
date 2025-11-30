package com.frontier.agent.repository;

import com.frontier.agent.domain.Goal;
import com.frontier.agent.domain.GoalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface GoalRepository extends JpaRepository<Goal, Long> {
    List<Goal> findByStatus(GoalStatus status);
    List<Goal> findByDeadlineBefore(Instant deadline);
}
