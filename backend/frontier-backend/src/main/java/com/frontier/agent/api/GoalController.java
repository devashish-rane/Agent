package com.frontier.agent.api;

import com.frontier.agent.domain.Goal;
import com.frontier.agent.repository.GoalRepository;
import com.frontier.agent.service.DynamoTimelineService;
import com.frontier.agent.service.GoalPlannerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * GoalController exposes a minimal surface to verify the planner path end-to-end.
 * We log lifecycle decisions to make on-call debugging easier when plans drift.
 */
@RestController
@RequestMapping("/api/goals")
public class GoalController {
    private static final Logger log = LoggerFactory.getLogger(GoalController.class);

    private final GoalPlannerService goalPlannerService;
    private final GoalRepository goalRepository;
    private final DynamoTimelineService dynamoTimelineService;

    public GoalController(GoalPlannerService goalPlannerService,
                          GoalRepository goalRepository,
                          DynamoTimelineService dynamoTimelineService) {
        this.goalPlannerService = goalPlannerService;
        this.goalRepository = goalRepository;
        this.dynamoTimelineService = dynamoTimelineService;
    }

    @PostMapping
    public ResponseEntity<Goal> createGoal(@RequestBody Goal goal, @RequestParam(defaultValue = "30") int days) {
        Goal created = goalPlannerService.createGoalWithPlan(goal, days);
        dynamoTimelineService.projectGoal(created);
        created.getTasks().forEach(dynamoTimelineService::projectTask);
        log.info("Goal {} created with {} tasks", created.getId(), created.getTasks().size());
        return ResponseEntity.ok(created);
    }

    @GetMapping
    public List<Goal> listGoals() {
        return goalRepository.findAll();
    }
}
