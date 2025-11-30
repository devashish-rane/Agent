# Frontier Ops Runbooks

These runbooks mirror the observability and guardrails described in the root README to keep incident response predictable.

## ALB/CloudFront health
- **Symptoms**: Elevated p95 latency, HTTP 5xx spikes, WAF blocks increasing.
- **Dashboards**: `frontier-<env>-golden-signals` in CloudWatch; confirm WAF sampled requests.
- **Actions**:
  1. Check ECS service deployments for recent task failures; roll back via CodeDeploy if active.
  2. Validate ALB + CloudFront WAF rules are attached; disable recent custom rules if false positives.
  3. Inspect Shield protections for ongoing L3/L4 events; enable rate-based WAF rule if flood persists.

## Database pressure / Flyway gates
- **Symptoms**: CPU >85%, migrations blocked in pipeline, elevated query latency.
- **Dashboards**: Database performance insights + ECS CPU graph widget.
- **Actions**:
  1. Abort deploy if Flyway dry-run fails; review migration ordering and lock acquisition.
  2. Scale read replicas or reduce connection pool in `/frontier/<env>/app/config` secret.
  3. Capture pg_stat_activity snapshot and store in `/ops/artifacts/db/<timestamp>.txt` for RCA.

## DynamoDB or timeline backlog
- **Symptoms**: Queue age rising, timeline writes throttled.
- **Actions**:
  1. Enable On-Demand auto scaling; verify partition key skew by inspecting hot keys.
  2. Use synthetic checks (below) to confirm ingestion still writes to projections.

## S3 object lock and recoveries
- **Symptoms**: Accidental deletes or overwrite attempts are denied.
- **Actions**:
  1. Confirm Object Lock default retention is intact; extend retention for the affected prefix.
  2. Restore version via `aws s3api get-object` using versionId noted in CloudTrail.

## Secrets rotation issues
- **Symptoms**: Application cannot connect to Postgres after rotation.
- **Actions**:
  1. Fetch latest secret version (`DB_SECRET`) and validate ECS task env refresh; force new deployment if stale.
  2. Re-run smoke tests stage in CodePipeline to ensure credentials succeed before promoting.
