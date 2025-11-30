package com.frontier.agent.api.graphql;

import com.frontier.agent.api.dto.GoalRequest;
import com.frontier.agent.api.dto.NoteRequest;
import com.frontier.agent.api.dto.TaskRequest;
import com.frontier.agent.domain.model.Goal;
import com.frontier.agent.domain.model.Note;
import com.frontier.agent.domain.model.Task;
import com.frontier.agent.domain.repository.GoalRepository;
import com.frontier.agent.domain.repository.NoteRepository;
import com.frontier.agent.domain.repository.TaskRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

@Controller
public class NoteGraphQlController {

    private final NoteRepository noteRepository;
    private final GoalRepository goalRepository;
    private final TaskRepository taskRepository;

    public NoteGraphQlController(NoteRepository noteRepository, GoalRepository goalRepository, TaskRepository taskRepository) {
        this.noteRepository = noteRepository;
        this.goalRepository = goalRepository;
        this.taskRepository = taskRepository;
    }

    @QueryMapping
    public List<Note> notesByUser(@Argument String userId) {
        return noteRepository.findByUserId(userId);
    }

    @QueryMapping
    public List<Goal> goalsByUser(@Argument String userId) {
        return goalRepository.findByUserId(userId);
    }

    @QueryMapping
    public List<Task> tasksByUser(@Argument String userId) {
        return taskRepository.findByUserId(userId);
    }

    @MutationMapping
    public Note createNote(@Argument NoteRequest input) {
        Note note = new Note();
        note.setUserId(input.userId());
        note.setContent(input.content());
        if (input.occurredAt() != null) {
            note.setOccurredAt(Instant.parse(input.occurredAt()));
        }
        return noteRepository.save(note);
    }

    @MutationMapping
    public Goal createGoal(@Argument GoalRequest input) {
        Goal goal = new Goal();
        goal.setUserId(input.userId());
        goal.setTitle(input.title());
        goal.setDescription(input.description());
        if (input.dueAt() != null) {
            goal.setDueAt(Instant.parse(input.dueAt()));
        }
        return goalRepository.save(goal);
    }

    @MutationMapping
    public Task createTask(@Argument TaskRequest input) {
        Task task = new Task();
        task.setUserId(input.userId());
        task.setTitle(input.title());
        task.setDescription(input.description());
        if (input.dueAt() != null) {
            task.setDueAt(Instant.parse(input.dueAt()));
        }
        return taskRepository.save(task);
    }
}
