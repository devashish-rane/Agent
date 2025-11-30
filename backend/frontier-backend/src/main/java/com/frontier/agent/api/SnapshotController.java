package com.frontier.agent.api;

import com.frontier.agent.domain.BehaviorSnapshot;
import com.frontier.agent.service.SnapshotService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * SnapshotController offers write and read methods for the 48-hour detector.
 * Keeping the payload small avoids overloading Postgres when agents post updates frequently.
 */
@RestController
@RequestMapping("/api/snapshots")
public class SnapshotController {

    private final SnapshotService snapshotService;

    public SnapshotController(SnapshotService snapshotService) {
        this.snapshotService = snapshotService;
    }

    @PostMapping
    public BehaviorSnapshot record(@RequestBody BehaviorSnapshot snapshot) {
        return snapshotService.recordSnapshot(snapshot);
    }

    @GetMapping
    public List<BehaviorSnapshot> recent() {
        return snapshotService.recentSnapshots();
    }
}
