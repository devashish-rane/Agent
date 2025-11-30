package com.frontier.agent.service;

import com.frontier.agent.domain.Goal;
import com.frontier.agent.domain.PlannedTask;
import com.frontier.agent.domain.TaskStatus;
import com.frontier.agent.repository.GoalRepository;
import com.frontier.agent.repository.PlannedTaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * GoalPlannerService keeps the adaptive plan small and auditable. The service avoids
 * multi-day transactions, slices tasks into daily buckets, and records decisions in
 * logs for replay during incident analysis.
 */
@Service
public class GoalPlannerService {
    private static final Logger log = LoggerFactory.getLogger(GoalPlannerService.class);

    private final GoalRepository goalRepository;
    private final PlannedTaskRepository plannedTaskRepository;

    public GoalPlannerService(GoalRepository goalRepository, PlannedTaskRepository plannedTaskRepository) {
        this.goalRepository = goalRepository;
        this.plannedTaskRepository = plannedTaskRepository;
    }

    @Transactional
    public Goal createGoalWithPlan(Goal goal, int days) {
        log.info("Planning goal '{}' for {} days", goal.getTitle(), days);
        Goal persisted = goalRepository.save(goal);
        List<PlannedTask> tasks = generateTasks(persisted, days);
        plannedTaskRepository.saveAll(tasks);
        persisted.setTasks(tasks);
        return persisted;
    }

    private List<PlannedTask> generateTasks(Goal goal, int days) {
        List<PlannedTask> tasks = new ArrayList<>();
        for (int i = 0; i < days; i++) {
            PlannedTask task = new PlannedTask();
            task.setGoal(goal);
            task.setTitle("Day " + (i + 1) + " focus for " + goal.getTitle());
            task.setDescription("Auto-generated focus block; refine once behavioral signals arrive.");
            task.setScheduledFor(Instant.now().plus(i, ChronoUnit.DAYS));
            task.setCognitiveLoad(Math.min(5, 1 + (i / 7))); // ramp weekly
            task.setEstimatedMinutes(45);
            task.setStatus(TaskStatus.PLANNED);
            tasks.add(task);
        }
        return tasks;
    }
}
