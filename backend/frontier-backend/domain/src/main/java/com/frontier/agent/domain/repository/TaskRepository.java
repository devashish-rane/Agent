package com.frontier.agent.domain.repository;

import com.frontier.agent.domain.model.Task;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<Task, UUID> {
    List<Task> findByUserId(String userId);
}
