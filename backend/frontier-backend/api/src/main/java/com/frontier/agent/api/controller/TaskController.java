package com.frontier.agent.api.controller;

import com.frontier.agent.api.dto.TaskRequest;
import com.frontier.agent.api.service.TimelineService;
import com.frontier.agent.domain.model.Task;
import com.frontier.agent.domain.repository.TaskRepository;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskRepository taskRepository;
    private final TimelineService timelineService;

    public TaskController(TaskRepository taskRepository, TimelineService timelineService) {
        this.taskRepository = taskRepository;
        this.timelineService = timelineService;
    }

    @PostMapping
    public ResponseEntity<Task> create(@Valid @RequestBody TaskRequest request) {
        Task task = new Task();
        task.setUserId(request.userId());
        task.setTitle(request.title());
        task.setDescription(request.description());
        if (request.dueAt() != null) {
            task.setDueAt(Instant.parse(request.dueAt()));
        }
        Task saved = taskRepository.save(task);
        timelineService.record(saved.getUserId(), saved.getDueAt() != null ? saved.getDueAt() : Instant.now(),
                "task", saved.getId(), "{}");
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/user/{userId}")
    public List<Task> byUser(@PathVariable String userId) {
        return taskRepository.findByUserId(userId);
    }
}
