package com.frontier.agent.domain.repository;

import com.frontier.agent.domain.model.Note;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteRepository extends JpaRepository<Note, UUID> {
    List<Note> findByUserId(String userId);
}
