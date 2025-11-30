# Chaos Scenarios

These drills align with the README resilience notes and should be executed in staging first.

1. **WAF block regression**
   - Inject a burst of requests from a disallowed CIDR and confirm CloudFront + ALB WAF rules block traffic without tripping healthy client flows.
   - Verify Shield events are logged and ALB latency alarm does not flap excessively.

2. **Database credential rotation mid-deploy**
   - Force a Secrets Manager rotation during a rolling ECS deploy.
   - Expected behavior: tasks pick up new `DB_SECRET` without downtime; pipeline smoke tests remain green.

3. **Flyway long-running migration**
   - Introduce a migration that sleeps for 90s and ensure the Flyway dry-run gate fails the pipeline.
   - Validate manual approval cannot be granted until a corrected migration passes the dry-run.

4. **Timeline projection throttling**
   - Simulate burst writes against DynamoDB; watch that p95 latency alarm stays green while the system scales or sheds load.
   - Ensure synthetic `timeline-ingest` check raises an alert and on-call can follow the runbook above.
