package com.frontier.agent.api.controller;

import com.frontier.agent.api.dto.GoalRequest;
import com.frontier.agent.api.service.TimelineService;
import com.frontier.agent.domain.model.Goal;
import com.frontier.agent.domain.repository.GoalRepository;
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
@RequestMapping("/api/goals")
public class GoalController {

    private final GoalRepository goalRepository;
    private final TimelineService timelineService;

    public GoalController(GoalRepository goalRepository, TimelineService timelineService) {
        this.goalRepository = goalRepository;
        this.timelineService = timelineService;
    }

    @PostMapping
    public ResponseEntity<Goal> create(@Valid @RequestBody GoalRequest request) {
        Goal goal = new Goal();
        goal.setUserId(request.userId());
        goal.setTitle(request.title());
        goal.setDescription(request.description());
        if (request.dueAt() != null) {
            goal.setDueAt(Instant.parse(request.dueAt()));
        }
        Goal saved = goalRepository.save(goal);
        timelineService.record(saved.getUserId(), Instant.now(), "goal", saved.getId(), "{}");
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/user/{userId}")
    public List<Goal> byUser(@PathVariable String userId) {
        return goalRepository.findByUserId(userId);
    }
}
