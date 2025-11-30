package com.frontier.agent.repository;

import com.frontier.agent.domain.ResourcePack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ResourcePackRepository extends JpaRepository<ResourcePack, Long> {
}
