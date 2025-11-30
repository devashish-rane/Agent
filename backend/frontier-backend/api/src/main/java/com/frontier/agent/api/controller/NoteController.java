package com.frontier.agent.api.controller;

import com.frontier.agent.api.dto.NoteRequest;
import com.frontier.agent.api.service.TimelineService;
import com.frontier.agent.domain.model.Note;
import com.frontier.agent.domain.model.NoteType;
import com.frontier.agent.domain.repository.NoteRepository;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notes")
public class NoteController {

    private static final Logger log = LoggerFactory.getLogger(NoteController.class);

    private final NoteRepository noteRepository;
    private final TimelineService timelineService;

    public NoteController(NoteRepository noteRepository, TimelineService timelineService) {
        this.noteRepository = noteRepository;
        this.timelineService = timelineService;
    }

    @PostMapping
    public ResponseEntity<Note> create(@Valid @RequestBody NoteRequest request) {
        Note note = new Note();
        note.setUserId(request.userId());
        note.setContent(request.content());
        if (request.type() != null) {
            note.setType(NoteType.valueOf(request.type().toUpperCase()));
        }
        if (request.occurredAt() != null) {
            note.setOccurredAt(Instant.parse(request.occurredAt()));
        }
        Note saved = noteRepository.save(note);
        timelineService.record(saved.getUserId(), saved.getOccurredAt() != null ? saved.getOccurredAt() : Instant.now(),
                "note", saved.getId(), "{}");
        log.info("note created {} for user {}", saved.getId(), saved.getUserId());
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/user/{userId}")
    public List<Note> byUser(@PathVariable String userId) {
        return noteRepository.findByUserId(userId);
    }
}
