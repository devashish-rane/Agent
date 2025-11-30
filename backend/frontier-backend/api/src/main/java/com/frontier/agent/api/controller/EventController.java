package com.frontier.agent.api.controller;

import com.frontier.agent.api.dto.EventRequest;
import com.frontier.agent.api.service.TimelineService;
import com.frontier.agent.domain.model.Event;
import com.frontier.agent.domain.repository.EventRepository;
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
@RequestMapping("/api/events")
public class EventController {

    private final EventRepository eventRepository;
    private final TimelineService timelineService;

    public EventController(EventRepository eventRepository, TimelineService timelineService) {
        this.eventRepository = eventRepository;
        this.timelineService = timelineService;
    }

    @PostMapping
    public ResponseEntity<Event> create(@Valid @RequestBody EventRequest request) {
        Event event = new Event();
        event.setUserId(request.userId());
        event.setName(request.name());
        event.setDescription(request.description());
        event.setScheduledAt(Instant.parse(request.scheduledAt()));
        Event saved = eventRepository.save(event);
        timelineService.record(saved.getUserId(), saved.getScheduledAt(), "event", saved.getId(), "{}");
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/user/{userId}")
    public List<Event> byUser(@PathVariable String userId) {
        return eventRepository.findByUserId(userId);
    }
}
