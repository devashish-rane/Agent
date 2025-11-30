package com.frontier.agent.domain.service;

import com.frontier.agent.domain.model.IdempotencyKey;
import com.frontier.agent.domain.repository.IdempotencyKeyRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Provides idempotency guarantees for SQS handlers. The implementation purposely records
 * keys synchronously in Postgres to ensure auditability while allowing higher-level
 * workers to write the same keys into DynamoDB for fast replay checks.
 */
@Service
public class IdempotencyService {

    private static final Logger log = LoggerFactory.getLogger(IdempotencyService.class);

    private final IdempotencyKeyRepository repository;

    public IdempotencyService(IdempotencyKeyRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public boolean tryAcquire(String key, String owner, Duration ttl) {
        Optional<IdempotencyKey> existing = repository.findById(key);
        if (existing.isPresent()) {
            log.debug("idempotency key {} already claimed by {}", key, existing.get().getOwner());
            return false;
        }
        repository.save(new IdempotencyKey(key, owner));
        return true;
    }
}
