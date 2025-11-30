package com.frontier.agent.api;

import com.frontier.agent.domain.ResourcePack;
import com.frontier.agent.repository.ResourcePackRepository;
import com.frontier.agent.service.ResourcePackService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ResourcePackController manages curated artifacts. The POST path stores a tiny
 * placeholder object in S3 to keep deployments fast even before the heavy work finishes.
 */
@RestController
@RequestMapping("/api/resource-packs")
public class ResourcePackController {

    private final ResourcePackService resourcePackService;
    private final ResourcePackRepository resourcePackRepository;

    public ResourcePackController(ResourcePackService resourcePackService, ResourcePackRepository resourcePackRepository) {
        this.resourcePackService = resourcePackService;
        this.resourcePackRepository = resourcePackRepository;
    }

    @PostMapping
    public ResponseEntity<ResourcePack> create(@RequestBody ResourcePack pack) {
        return ResponseEntity.ok(resourcePackService.persistPack(pack));
    }

    @GetMapping
    public List<ResourcePack> list() {
        return resourcePackRepository.findAll();
    }
}
