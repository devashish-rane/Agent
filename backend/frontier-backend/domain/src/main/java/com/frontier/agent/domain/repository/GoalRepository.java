package com.frontier.agent.domain.repository;

import com.frontier.agent.domain.model.Goal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GoalRepository extends JpaRepository<Goal, UUID> {
    List<Goal> findByUserId(String userId);
}
