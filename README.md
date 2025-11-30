# Frontier Agent AI – Personal Growth Operating System

## Vision
Frontier Agent AI is a multi-agent “Growth OS” that continuously learns from a user’s notes, goals, events, reflections, and habits to produce structured knowledge, adaptive plans, research-backed recommendations, and contextual playbooks. The system acts as a personal strategist and coach, proactively preparing users for important moments and improving routines over time.

## Product Objectives
- **Universal ingestion**: Transform any free-form text into structured knowledge connected to a personal graph.
- **Background research**: Launch autonomous research for goals/events to deliver curated, validated resources.
- **Adaptive planning**: Convert goals into time-boxed plans that adjust to user execution patterns.
- **Pattern detection**: Surface behavioral insights (productivity rhythms, failure points, habit durability).
- **Contextual playbooks**: Trigger specialized action packs (e.g., dating, interviews, health) based on notes.
- **Daily intelligence**: Provide a concise, high-value daily brief with tasks, nudges, and insights.

## Opinionated Production Stack (AWS + CDK + Spring Boot + React)
- **Infrastructure-as-Code**: AWS CDK blueprints for repeatable, guardrail-heavy environments (dev/stage/prod) with CI/CD validations to prevent drift and unsafe rollouts. Pipelines enforce canary/blue-green, pre-migration smoke tests, config drift detection, and required alarms before deploy.
- **Backend**: Spring Boot (Java 21) on ECS/Fargate behind an ALB; Spring Cloud AWS for SQS/EventBridge integration; optional Spring Cloud Task workers for bursty jobs. JVM flags + layered Docker image to keep cold starts low and debugging symbols intact.
- **Frontend**: React SPA with a design-system-first approach (dark/light themes, keyboardable command palette, timeline heatmaps). Served from CloudFront + S3, backed by WAF and Shield; feature flags via Config/Parameter Store for safe UI rollouts.
- **Storage**:
  - Postgres (RDS) with `pgvector` for relational + vector workloads; pgbouncer for connection pooling; read replicas for analytics.
  - DynamoDB projections for high-velocity feeds (timeline, daily moves, execution ledgers) with On-Demand capacity + TTL for transient artifacts.
  - S3 for versioned resource packs, research artifacts, exportable timelines, and UI media; bucket policies scoped per service account.
- **Search & Research**: Web-search API + YouTube Data API; circuit breakers and cached fallbacks in S3 for resilience.
- **Queue/Scheduling**: SQS for agent orchestration; EventBridge for cron + rule-based triggers (snapshot agent, daily brief, RCA sweeps); DLQs + alarmed redrive queues; idempotency keys stored in DynamoDB.
- **Identity & Security**: Cognito user pools + JWT; fine-grained IAM roles per agent; Secret Manager/Parameter Store for keys; pervasive audit logging for risky mutations.
- **Observability & Operability**: CloudWatch metrics/logs, X-Ray tracing, structured JSON logs with correlation IDs, profiling hooks (Async Profiler/JFR) enabled in prod-safe mode, and “debug capsules” (S3 bundles with inputs/outputs) for post-mortem analysis.

### Repo & Deployment Shape (to keep prod predictable)
- **`/cdk`**: Reusable CDK stacks for networking, data, compute, observability, and CI/CD. Includes synthesized guardrails that fail a build when RDS is public, WAF is missing, alarms are absent, or IAM policies are wildcarded.
- **`/backend`**: Spring Boot multi-module project (API, worker, shared domain, observability starter). Uses conventional package naming (`com.frontier.agent.*`), Spring Cloud AWS clients, Flyway migrations, and Micrometer bindings.
- **`/frontend`**: React SPA with Vite, shared design system, and Storybook for stateful components (timeline, planner board, Today Hub). Feature-flagged experiments live under `/experiments` and can be disabled per-environment via Config.
- **`/ops`**: Runbooks, synthetic check configs, chaos scenarios, and response playbooks. Generated “debug capsules” land in `/ops/artifacts` for quick reproduction.

### Stability + Observability Defaults (baked in, not optional)
- **Golden signals**: p95 latency, error rate, queue age, plan-generation success rate, and vector-latency gauges exported to CloudWatch + dashboards with “burn-rate” alerts.
- **Trace everywhere**: All agent invocations carry `correlation_id`, `context_version`, and `schema_version`; stored in logs + traces. UI also forwards `session_id` to link user actions to backend work.
- **Runtime safety**: Circuit breakers on external research calls; bulkheads for LLM calls; `Retry-After` headers when rate-limiting ingestion to protect cost budgets.
- **Debug-first artifacts**: Every adaptive plan or research pack is versioned and can be replayed locally via stored prompt + input hash in S3. Canary releases emit comparison diffs before promotion.

## Core Agents and Responsibilities
- **NoteParserAgent**: Type detection (note/goal/event/thought/journal), entity extraction, domain classification, embedding generation, and graph linking.
- **GoalPlannerAgent**: Builds/adapts time-boxed plans with difficulty ramps, milestones, buffers, and personalized cadence adjustments.
- **ResearchAgent**: Runs searches, quality filters, fact validation, and multi-source summarization.
- **ResourcePackAgent**: Curates and maintains resource bundles attached to goals/events; updates as new content emerges.
- **PatternMiningAgent**: Mines behavioral trends (completion rates, timing, energy patterns, habit decay) and produces insights.
- **ContextAgent**: Detects triggers (e.g., “date Friday”, “system design interview”) and generates playbooks.
- **DailyCoachAgent**: Produces the daily brief (3 key tasks, quick win, habit nudge, insight, schedule overview, micro-plan updates).

## Detailed Delivery Plan
### Phase 1: Foundations & Ingestion
- **Setup**: Spring Boot service scaffold on ECS Fargate, RDS Postgres with `pgvector`, DynamoDB tables for timeline/daily briefs, Cognito/JWT auth middleware, health checks, and observability plumbing (X-Ray + CloudWatch).
- **Data Model**: Schemas for users, notes, entities, goals, events, tasks, playbooks, resource packs, insights, embeddings.
- **Ingestion Pipeline**: Endpoints for raw notes; NoteParserAgent to classify, extract entities, and store structured objects + embeddings; similarity linking to existing graph entries.
- **Baseline UI**: React layout with login, note input, and timeline stub.

**Backend service layout (Phase 1)**
- API module: `/api` with REST + GraphQL endpoints for notes/goals/events/tasks; integrated validation and audit logging middleware.
- Worker module: `/worker` consuming SQS queues for NoteParserAgent + initial linking jobs with idempotency keys stored in DynamoDB.
- Shared modules: `/domain` (entities + repositories), `/observability` (tracing/logging/meter registries), `/clients` (search, embeddings, YouTube).
- Flyway migrations run before app starts; blue/green deploys block if migrations exceed 60s in staging to prevent prod outages.

### Phase 2: Planning & Playbooks
- **Goal Planning**: GoalPlannerAgent to generate adaptive plans with milestones, buffers, and difficulty ramps; daily/weekly tasks with feedback loop based on execution history (persisted in Postgres for lineage and in DynamoDB for read-optimized timelines).
- **Contextual Playbooks**: ContextAgent trigger library (dating, career/system design, health) generating logistics, plans, checklists, and reminders; attach to timeline and upcoming events with S3-backed artifacts for recovery.
- **Daily Coach v1**: EventBridge cron + SQS job to assemble today’s moves and send to frontend/API; job idempotency via deterministic keys to avoid duplicates after retries.

**Backend service layout (Phase 2)**
- Planner worker pool: dedicated ECS service that locks by `goal_id` to avoid plan thrash; writes plan lineage to Postgres and DynamoDB projections.
- Context playbook service: stateless Spring Boot app with template registry in S3; ships with contract tests to prevent regressions when templates change.
- Daily brief assembler: pulls from Postgres, DynamoDB feed, and cached embeddings; emits S3 debug capsules when falling back due to degraded vector search.

### Phase 3: Research & Resource Packs
- **Autonomous Research**: ResearchAgent pipeline with search, quality scoring, validation, and summarization; retries and circuit breakers to avoid prod failures.
- **Resource Packs**: ResourcePackAgent organizes validated resources per goal/event; scheduled refresh to capture new content; surfacing relevance scores and source provenance for debugging.
- **Frontend Surfacing**: Resource pack cards in goal/event views; status indicators for research progress and validation outcomes.

**Backend service layout (Phase 3)**
- Research agent runner: isolates outbound calls with timeouts and rate limits; caches validated resources in S3 and indexes metadata in DynamoDB for fast reads.
- Resource pack curator: merges human feedback with agent output; maintains version history and diffs for debugging.

### Phase 4: Pattern Mining & Insights
- **Behavior Analytics**: PatternMiningAgent analyzing completion times, streaks, skips, and energy patterns; generates actionable insights and recommended plan adjustments.
- **Adaptation Loop**: Plans auto-adjust using insights (shorter tasks if failures cluster, rest days after streak drop-off, difficulty increase for fast completions).
- **User Feedback Hooks**: Allow user to accept/reject adaptations; log decisions for future tuning.

**Backend service layout (Phase 4)**
- Pattern mining jobs: EventBridge-triggered analytics running against RDS read replica; writes insights with `pattern_version` to avoid stale overrides.
- Adaptation coordinator: enforces guardrails (no deadline extensions without explicit flag); publishes “proposed changes” to a review queue the UI can surface.

### Phase 5: Production Hardening
- **Reliability**: Idempotent queue handlers, deduplication keys, dead-letter queues, and backoff policies for agent tasks.
- **Security & Privacy**: PII tagging, encryption at rest/in transit, scoped tokens, and redaction in logs.
- **Observability**: End-to-end tracing across agents with correlation IDs; structured logs capturing agent decisions and validation steps for debugging; push critical anomalies to PagerDuty/Slack with runbooks for common failure modes (e.g., research API quota, vector store latency).
- **Testing**: Unit + integration tests for agents; contract tests for external APIs; load tests for ingestion and search; chaos drills for queue and scheduler failures.
- **Deployment**: CI/CD with migrations, feature flags for risky agents, health probes, and rollout/rollback plans; blue/green or canary deploys on ECS; pre-deploy smoke tests with synthetic notes/goals to catch schema or embedding regressions; alarms on migration duration to prevent deployment failures.

**Backend service layout (Phase 5)**
- Chaos scenarios: synthetic failures for vector store, research API, and DynamoDB throttling; recorded in `/ops/chaos` with reproduction steps.
- Post-incident kits: automated collection of logs/traces/debug capsules into S3 with metadata for root cause analysis.

## AWS & Production Design Notes (Debuggability First)
- **Networking**: Private subnets for app + DB; NAT for outbound research calls; strict security groups between ALB, ECS tasks, RDS, and DynamoDB VPC endpoints.
- **Agent Resilience**: Each agent run carries a `correlation_id` and `parent_request_id`; store lightweight execution ledgers in DynamoDB with status, last error, retry count, and input hash to accelerate debugging and avoid repeated bad inputs.
- **Config & Secrets**: Centralized in AWS Systems Manager Parameter Store/Secrets Manager; include config version in logs to correlate runtime behavior with deployments.
- **Fail-Safe Patterns**:
  - ResearchAgent: circuit breaker when external API error rates spike; degrade to cached resource packs in S3.
  - Planner: never auto-extend deadlines silently—prefer to propose scope trims and log adjustments with user confirmation flags.
  - Daily Brief: if vector search is degraded, fall back to DynamoDB cached briefs; emit warning metrics to surface reduced relevance.
- **Schema Evolution**: Use flyway/liquibase migrations with pre-checks; add nullable fields before enforcing constraints; dual-write to Postgres + DynamoDB for new projections before cutover.
- **Deployment Safety Nets**: Feature flags per agent; “shadow mode” for new heuristics writing only to S3 logs; rollback scripts for recent migrations and S3 object versioning for playbooks/resource packs.
- **Performance Guardrails**: Rate-limit per-user ingestion to protect LLM costs; enforce token budgets per agent call; cache high-frequency prompts/templates in-memory and in Redis/ElastiCache if added later.

## AWS CDK Blueprint (Opionated Modules)
- **Networking Stack**: VPC with three AZs, private subnets for ECS/RDS, interface endpoints for SQS/DynamoDB/STS, and security group defaults that block egress unless allowlisted per service. CDK synths enforce no-public-RDS and require WAF on CloudFront/ALB.
- **Compute Stack**: ECS Fargate services for API + workers with auto-scaling tied to SQS depth and custom CloudWatch metrics (p95 latency, queue age). Capacity providers pre-warm tasks before cron bursts (daily brief, snapshot sweeps) to avoid cold starts.
- **Data Stack**: RDS Postgres with automated minor-version upgrades paused during business hours; DynamoDB tables with PITR and TTL; S3 buckets with Object Lock + versioning; pgbouncer sidecar for connection stability; CDK Guard rails prevent destructive changes without explicit approval.
- **Observability Stack**: Centralized log buckets, metric filters for agent failure signatures, X-Ray sampling rules per endpoint/agent, and alarms that open a PagerDuty maintenance window blocker to stop risky deploys when error budgets are low.
- **CI/CD Stack**: CodePipeline/CodeBuild running unit + integration suites, Flyway dry-run against shadow schema, CDK diff gates, and synthetic user scripts that post smoke notes/goals to catch regression before promotion. Canary deploys are default, with automated rollback if SLI drift exceeds thresholds.

## Slick UI & Clever Experience Layer
- **Command Palette + Copilot**: Global keyboard palette to add notes/goals/todos, invoke “Instant Helper,” and preview suggested playbooks. Inline embeddings preview shows why tasks are suggested (traceable recommendations for debugging UX issues).
- **Adaptive Timeline**: Multi-zoom timeline with heatmaps for cognitive load and streaks, collapsible snapshot cards, and RCA callouts. Offers “replay mode” to visualize how plans changed after each insight.
- **Today Hub**: Single-thread task lane with drag/drop, “capacity meter” indicator, and quick toggles to accept/reject plan adjustments. Includes a “safe-mode” view that hides experimental nudges when feature flags disable them.
- **Resource Atelier**: Goal detail pages show curated Resource Packs with provenance badges, freshness indicators, and S3 version rollbacks so users (and engineers) can compare agent outputs over time.

### CDK add-ons for stability
- **Observability stack**: opinionated dashboards + alarms (latency/error/queue age/vector latency), log retention defaults, X-Ray sampling rules, and SNS/PagerDuty wiring. CDK asserts fail synth if alarms are missing for SLOs.
- **Data safety rails**: pre-signed DB credentials rotation via Secrets Manager; automatic backup policies for RDS; PITR on DynamoDB; bucket versioning + lifecycle policies with delete protection for S3 artifacts.
- **Deployment pipeline**: CodePipeline/CodeBuild with smoke tests, contract tests (template JSON fixtures), infrastructure diff reviewers, and manual approval gates when stateful changes are detected.
- **Cost/limit guards**: budgets + alarms; capacity protections on DynamoDB; rate-limiters config surfaced as SSM params to let operations tune without redeploy.

## Interesting Edge Cases & Debug Notes
- **Stale embeddings after migrations**: When changing tokenization or prompt templates, dual-write embeddings with a version column; the Daily Coach should ignore mismatched versions and fall back to DynamoDB cached briefs to avoid blank mornings.
- **Race between goal updates and planner runs**: Protect with advisory locks keyed by goal_id; if a planner run starts with stale data, write the plan to S3 “debug capsule” and abort instead of overwriting live tasks.
- **EventBridge burst + cold starts**: Pre-scale ECS tasks 5 minutes before scheduled waves; keep JIT-compiled LLM templates warmed via background “primer” calls that log metrics without user impact.
- **Vector degradation**: If `pgvector` latency spikes, switch to DynamoDB projection search for the daily brief; emit a structured log with correlation_id and vector_latency_ms so oncall can root-cause quickly.
- **Deployment guardrails**: Block deployments if: pending migrations exceed 60s in staging, alarm states are non-green, or CDK diff shows replacement of stateful resources without manual override.

### Agent orchestration flows (with failure-handling baked in)
- **Note ingestion**: API -> SQS -> NoteParserAgent. If parsing fails, write payload + error to S3 capsule, enqueue to DLQ with alarm, and surface a UI toast to retry with a sanitized copy.
- **Goal planning loop**: Goal update -> Planner queue -> Postgres plan lineage + Dynamo timeline projection -> Today Hub. On conflict (stale revision), abort and surface a “review suggested changes” entry instead of overwriting tasks.
- **Daily brief**: EventBridge cron -> Brief assembler -> Dynamo + S3 capsule -> Notification. If vector search degraded, mark brief as “degraded” and include fallback_reason so UX can show a banner.
- **Research packs**: Todo/goal triggers -> Research runner -> S3 artifacts + Dynamo metadata -> UI. If outbound API budget is exhausted, serve cached packs, set `staleness_reason`, and queue a refresh when budgets reset.

## Data & Knowledge Graph Strategy
- Normalize notes/goals/events into domain-specific tables linked via join tables for people, places, topics, and tags.
- Store embeddings for text fields; use hybrid search (metadata filters + vector similarity) to link new notes with historical context.
- Maintain versioned knowledge graph entries to support audits and rollback of incorrect agent actions.

## Adaptive Planning Logic (Key Rules)
- Shorten task lengths after repeated skips; insert rest days when streaks drop around day 4–6.
- Increase difficulty when completion speed is higher than expected; add buffers before milestones.
- For habits, enforce “break-glass” reset weeks after multiple failures; for goals, propose scope trims rather than silent auto-extensions.

## Playbook Templates (Examples)
- **Dating**: Venue suggestions (quiet cafés), conversation starters, logistics checklist, do/don’t list, backup plan.
- **Career – System Design**: Topic breakdown, practice schedule, mock interview plan, example systems, common pitfalls, metrics to target.
- **Health – Fat Loss**: Nutrition basics, daily habits, 20-min workouts, weekly reset, grocery list.

## Daily Brief Structure (“Today’s Moves”)
- 3 priority tasks, 1 quick win, 1 habit nudge, 1 insight, schedule snapshot, and micro-plan updates for active goals.
- Delivered via morning job; pinned in UI with dismiss/snooze; store delivery + interaction telemetry for tuning.

## Slick UI Surfaces (built for clarity + speed)
- **Command Palette everywhere**: `cmd+k` exposes note entry, quick goals, playbook triggers, and “explain this plan” debugger that surfaces lineage and agent inputs.
- **Adaptive Timeline**: heatmaps for productivity and mood; inline cards for snapshots, RCAs, and playbooks; keyboard navigation and optimistic updates with rollbacks on API failures.
- **Today Hub**: single-thread task stream with context chips (energy, location, duration). Supports offline draft mode with conflict-resolution surfaces when back online.
- **Plan Workbench**: kanban + calendar hybrid for goals; visualizes buffers, recovery days, and cognitive load meter; hover reveals S3 debug capsule links.
- **Resource Atelier**: curated packs with freshness badges, fact-check status, and “compare versions” diff viewer to debug research changes.
- **Accessibility & perf**: prefers reduced motion, accessible colors, and skeleton loaders; aggressive code-splitting, HTTP/3, and caching headers tuned via CloudFront.

## Open Questions & Next Steps
- Confirm if any latency-critical components warrant a FastAPI sidecar service alongside the Spring Boot core.
- Finalize search vendor and key filtering heuristics for research quality.
- Decide on local-first/offline mode scope and conflict resolution strategy.
- Run small-batch user testing on daily brief usefulness and playbook accuracy; feed results into agent tuning.

## Contextual Personal Growth OS – Embedded Behavior Charter
The following embedded charter codifies how agents behave across goals, todos, snapshots, nudges, and memory. Treat it as a regression-proof reference for engineers, prompt designers, and QA—any deviation should be intentional and documented. Keeping it in the README makes it visible during schema or orchestration changes and reduces deployment surprises.

```text
// Frontier Agent AI – Contextual Personal Growth OS
// Core idea: A high-memory, context-aware agent system that turns goals, todos, and notes
// into adaptive plans, insights, and nudges. It tracks patterns over time, estimates
// cognitive load, and helps the user think in higher-order consequences.

// ======================================================================
// 1) Goals: Long-term Planner (30-day horizon)
// ======================================================================
// Input format example:
//   Goals: "Prepare for SDE-2 interviews in 30 days - focus: DSA + System Design + Java/Spring/AWS"
//
// Behavior:
// - Parse the goal into: objective, domains, deadline, constraints, motivation.
// - Generate a 30-day adaptive plan:
//     * Break into weeks -> days -> small tasks.
//     * Include buffer/recovery days.
//     * Tag each task with estimated cognitive load and duration.
// - Daily review cycle:
//     * At end of day, read completed/failed tasks and user notes.
//     * Adjust next days: shrink/simplify tasks if user is overloaded; increase difficulty if user is cruising.
// - Weekly recalibration:
//     * Re-plan the remaining days based on actual execution patterns, not ideal plan.
//     * Drop non-essential stuff, double down on what’s working.
//
// Output:
// - 30-day plan with daily tasks and clear focus for each day.
// - Rolling updates to keep the plan realistic, not fantasy.
// - Explicit mapping: goal -> tasks -> progress over time.

// ======================================================================
// 2) todo: Micro-task Agent + Instant Helper
// ======================================================================
// Input format example:
//   todo: "Find high-protein breakfast ideas under 10 min."
//   todo: "Check best Java interview sheet."
//
// Behavior:
// - Parse todo into intent: research / action / reminder / prep.
// - For research-type todos:
//     * Immediately spin an agent that searches, filters, and summarizes 3–5 relevant resources.
//     * Attach a compact "Resource Pack" to this todo (links + brief notes).
// - For action-type todos:
//     * Suggest the smallest executable version ("2-minute starter").
//     * Optionally auto-generate steps or templates (email draft, checklist, script, etc.).
// - For time-bound todos:
//     * Tag with date/time and show in the "single thread of tasks" timeline (see below).
//
// Output:
// - Todos are never “dead text”; each one becomes:
//     * either agent-assisted (pre-researched),
//     * or broken into a micro-executable action.

// ======================================================================
// 3) Snapshots: 48-hour Pattern Detector
// ======================================================================
// Behavior:
// - Every 2 days, run a "Snapshot Agent" to analyze:
//     * tasks completed vs skipped,
//     * time-of-day productivity,
//     * domains where user is progressing vs stuck (career, health, dating, etc.),
//     * emotional tone from notes (low/medium/high energy, stress, frustration, etc.).
// - Generate a short 48-hour summary:
//     * "You completed X/Y tasks, most progress in <domain>."
//     * "You tend to fail tasks scheduled early morning."
//     * "Focus and mood dipped on these days; likely overload or context mismatch."
// - Feed this back into:
//     * Goals planner (to adjust plan),
//     * Bias-for-action pusher (to change nudge strategy),
//     * Cognitive load meter baseline.
//
// Output:
// - A timeline of 48-hour snapshots with pattern insights,
// - JSON-like object describing new patterns to update future plans and nudges.

// ======================================================================
// 4) Bias for Action Pusher: Momentum Engine
// ======================================================================
// Behavior:
// - Continuously monitors:
//     * overdue tasks,
//     * repeated skips,
//     * goals untouched for > N days,
//     * signs of procrastination (e.g. many low-impact todos, no big tasks).
// - Generates targeted nudges:
//     * "Do the 5-minute version of this now."
//     * "You’ve already done 3 days; don’t break the streak."
//     * "Swap this heavy task with a smaller one today; you’re overloaded."
// - Uses context (time, energy pattern, recent snapshots, cognitive load):
//     * push hard when capacity is high,
//     * suggest minimal viable action when capacity is low.
//
// Output:
// - Smart, context-aware nudges that increase action,
// - Reduced friction between intention and execution.

// ======================================================================
// 5) High Order Thinking: Second-Order & Third-Order Consequences
// ======================================================================
// Behavior:
// - For each major Goal or big decision-note, run a "High Order Thinking Agent":
//     * Analyze first-order outcome: "You pass SDE-2 interviews."
//     * Analyze second-order effects: "Better offers, more confidence, new opportunities."
//     * Analyze third-order effects: "Better financial base, more risk-taking ability later."
// - Also analyze tradeoffs and opportunity cost:
//     * "If you commit to this goal, what should you deprioritize?"
//     * "What hidden risks or failure modes exist?"
// - Generates a short foresight summary:
//     * "If you follow this 30-day plan, likely trajectory is A; if you don’t, trajectory B."
//
// Output:
// - A compact consequence map for each big goal,
// - Helps user think deeper, not just act blindly.

// ======================================================================
// 6) RCA: Root Cause Analysis Engine
// ======================================================================
// Behavior:
// - When a task/goal repeatedly fails or stalls, the "RCA Agent" kicks in.
// - It looks at:
//     * how many times user has skipped similar tasks,
//     * time of day, domain, cognitive load level,
//     * notes or complaints around those tasks,
//     * external constraints mentioned (time, health, environment, people).
// - Produces a hypothesized root cause:
//     * "Tasks too big and vague.",
//     * "Scheduled at a low-energy time.",
//     * "User lacks prerequisite skill or resource.",
//     * "Emotional resistance (fear, boredom, overwhelm)."
// - Suggests a fix:
//     * break task down, reschedule, change environment, add warm-up step, etc.
//
// Output:
// - A root-cause record per recurring failure,
// - Updated plan with friction removed.

// ======================================================================
// 7) Cognitive Load Meter: Mental/Energy State Estimator
// ======================================================================
// Behavior:
// - Infer "cognitive load" score from:
//     * number and difficulty of tasks completed in last 48 hours,
//     * language in notes (stressed/overwhelmed vs excited/focused),
//     * sleep/energy comments if present,
//     * pattern of late-night work vs early burnout.
// - Maintain a dynamic "load score" (0–100).
// - Feed this into:
//     * Goal planner (don’t overload),
//     * Bias-for-action (choose softer or stronger nudges),
//     * Snapshot summaries (show when user is running too hot or too cold).
//
// Output:
// - Real-time and 48-hour rolling cognitive load score,
// - Used to throttle or ramp up the intensity of plans and nudges.

// ======================================================================
// 8) Memories Attached to Timeline + Single Thread of Tasks
// ======================================================================
// Timeline Memory:
// - Every note, goal, todo, snapshot, and RCA insight is attached to a chronological
//   timeline (like a journal of your growth).
// - Each entry stores:
//     * raw text,
//     * structured form,
//     * embeddings,
//     * related goals/tasks,
//     * emotional tone,
//     * cognitive load at the time.
// - This allows the system to:
//     * show "How you got here",
//     * replay past streaks and drops,
//     * provide monthly/weekly narrative summaries.

// Single Thread of Tasks:
// - All active tasks from all goals/todos flow into ONE prioritized stream:
//     * ordered by importance, urgency, context fit, and user’s current cognitive load.
// - At any moment, user sees:
//     * "Here is your next best 1–3 tasks to do now."
// - This thread is updated continuously based on:
//     * daily reviews,
//     * snapshots,
//     * RCA findings,
//     * live cognitive load.

// Output:
// - A unified "life feed" of tasks and memories,
// - Tight connection between what you do and how you felt/learned over time.

// ======================================================================
// 9) Context + High Memory Integration (Core Principle)
// ======================================================================
// - All agents (Goals, todo, Snapshots, Bias-for-action, High-order thinking, RCA,
//   Cognitive load) read from the same MEMORY LAYER:
//     * Past goals,
//     * Past tasks,
//     * Snapshot history,
//     * RCA history,
//     * Cognitive load history,
//     * Timeline of notes & events.
// - For every new user input or daily tick:
//     * Build a CONTEXT OBJECT that includes:
//         - active goal(s),
//         - current cognitive load,
//         - recent successes/failures,
//         - current streaks,
//         - upcoming events (interview, date, travel),
//         - known friction patterns,
//         - current “season” (high grind / recovery / overwhelmed / exploring).
//     * Pass this context into each agent so decisions (plans, nudges, insights)
//       are always personal, situational, and consistent with the user’s history.

// Goal:
// - Make the agent feel like a long-term, high-memory, context-aware coach,
//   not a stateless chatbot.
// ----------------------------------------------------------------------
```

## Relational Schema (Postgres with `pgvector`)
Design prioritizes auditability, replay, and safe migrations. All tables include `created_at`, `updated_at`, and `version` for optimistic locking. Use soft deletes (`deleted_at`) instead of hard deletes to preserve lineage. Run migrations via Flyway/Liquibase with preflight checks against staging and alarms on runtime to avoid deployment failures.

```sql
-- Core entities
CREATE TABLE app_user (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  cognito_sub TEXT UNIQUE NOT NULL,
  display_name TEXT,
  tz TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE note (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES app_user(id),
  raw_text TEXT NOT NULL,
  note_type TEXT NOT NULL, -- note | goal | event | thought | journal
  domain TEXT,             -- career | health | dating | finances | habits
  occurred_at TIMESTAMPTZ,
  embedding VECTOR,        -- pgvector
  structured JSONB,        -- extracted entities
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE goal (
  id UUID PRIMARY KEY,
  note_id UUID REFERENCES note(id),
  user_id UUID REFERENCES app_user(id),
  title TEXT NOT NULL,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'active',
  motivation TEXT,
  constraints JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE task (
  id UUID PRIMARY KEY,
  goal_id UUID REFERENCES goal(id),
  user_id UUID REFERENCES app_user(id),
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ,
  cognitive_load SMALLINT, -- 0-100
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT NOT NULL,    -- goal_planner | todo | nudge
  parent_task_id UUID REFERENCES task(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE todo (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES app_user(id),
  title TEXT NOT NULL,
  intent TEXT,         -- research | action | reminder | prep
  due_at TIMESTAMPTZ,
  resource_pack_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE resource_pack (
  id UUID PRIMARY KEY,
  goal_id UUID REFERENCES goal(id),
  todo_id UUID REFERENCES todo(id),
  s3_uri TEXT NOT NULL,      -- immutable bundle in S3
  summary JSONB,
  validation JSONB,          -- provenance, quality scores
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE snapshot (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES app_user(id),
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  insights JSONB,
  load_score SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rca_record (
  id UUID PRIMARY KEY,
  task_id UUID REFERENCES task(id),
  hypothesis TEXT NOT NULL,
  evidence JSONB,
  recommended_fix JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE timeline_entry (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES app_user(id),
  occurred_at TIMESTAMPTZ NOT NULL,
  entry_type TEXT NOT NULL, -- note | goal | task | todo | snapshot | rca
  entry_id UUID NOT NULL,   -- references specific table id
  embedding VECTOR,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Execution ledger for debugging and retries
CREATE TABLE agent_run (
  id UUID PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  parent_request_id TEXT,
  input_hash TEXT,
  status TEXT NOT NULL,
  last_error TEXT,
  retries INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Schema guidance for production**
- Prefer UUID primary keys to simplify cross-system references and avoid hot spots.
- Add partial indexes on `status`, `user_id`, and `due_at` for timeline reads; use GIN indexes on JSONB fields used for filters (domains, tags).
- Keep embeddings in Postgres unless RDS latency spikes—only then shard to a managed vector store; feature-flag the switchover with dual-write until verified.
- For migrations touching large tables, use phased rollouts (add nullable columns, backfill in batches, then enforce constraints) to prevent deploy-time locks.

## DynamoDB Projections (Read-optimized, fault-tolerant views)
- **timeline_feed**: partition key `user_id`, sort key `occurred_at#entry_type#entry_id`; includes condensed metadata and cognitive load to render the unified life feed quickly even if Postgres is degraded.
- **daily_brief_cache**: partition key `user_id`, sort key `yyyymmdd`; stores finalized briefs and fallback content when vector search is impaired. TTL after 72 hours to avoid stale surfacing.
- **agent_run_ledger**: partition key `correlation_id`, sort key `agent_name#timestamp`; mirrors the Postgres `agent_run` table for fast debugging and to survive RDS incidents. Writes are idempotent with deterministic keys.
- **task_queue_shadow**: partition key `user_id`, sort key `status#due_at`; optional denormalized task list for the “single thread” UI in case of SQS replay issues.

**DynamoDB operational notes**
- Enable point-in-time recovery and auto-scaling; enforce strict IAM to limit blast radius.
- Use streams to replicate critical ledger changes back to S3 for long-term audit if required.
- Include version fields and optimistic locking when agents update the same item to avoid lost updates during retries.

## S3 Artifacts and Versioning
- Store research bundles, playbooks, and resource packs at deterministic URIs (`s3://frontier-artifacts/{user_id}/{goal_id}/{version}/pack.json`).
- Enable bucket versioning and server-side encryption; retain last N versions for rollback and forensic debugging.
- Emit object metadata with `agent_name`, `correlation_id`, and schema version to correlate runs and artifacts.

## Failure-Resilient Agent Execution Flow
- All SQS handlers must be idempotent: derive deterministic keys for resource packs, snapshots, and briefs; short-circuit if the same `correlation_id` and input hash already completed.
- Use EventBridge rules with dead-letter queues and alarmed retry budgets; surface failures to Slack/PagerDuty with runbook links.
- Capture structured logs per agent run including decision rationale, external-call summaries, and feature-flag states for quick debugging.
- Keep a “shadow mode” path: new heuristics write outputs to S3 and logs only until human-verified, preventing surprise behavior in production.

## Debuggability & Deployment Safeguards
- Propagate correlation IDs from API through agents, queues, DB writes, and S3 object metadata.
- Add synthetic canary notes/goals executed on every deploy to validate ingestion, embeddings, and planner loops before full rollout.
- Maintain contract tests against web-search and YouTube APIs; fallback to cached packs on quota/rate-limit errors, with explicit user-facing warnings.
- Prefer feature flags around schema-dependent code; ship read paths first, then write paths, then flip flags after observing metrics to avoid deployment failures.

## Codebase layout (initial implementation)

This repository now carries runnable scaffolding that matches the production blueprint:

- `backend/frontier-backend` – Spring Boot 3 skeleton with goal planner, snapshot ingestion, DynamoDB timeline projection, and S3-backed resource packs. Postgres schema is JPA-driven with pgvector-ready entities kept small for stability.
- `frontend` – React + Vite shell with slick Command Palette, Today Hub, and Timeline tiles that map to backend projections. Styles lean on gradients and cards for a polished feel while remaining lightweight.
- `infra` – AWS CDK TypeScript stack that provisions VPC, Fargate service shell, RDS Postgres, DynamoDB timeline table, versioned S3 bucket for packs, and stubbed SNS/SSM guardrails for rollout safety.

### How to use locally

1. **Backend**
   - Configure Postgres credentials in `backend/frontier-backend/src/main/resources/application.yml`.
   - Run `mvn spring-boot:run` (dependencies pinned; resolves when network is available). The service exposes `/api/goals`, `/api/snapshots`, and `/api/resource-packs` for quick smoke tests.
2. **Frontend**
   - From `frontend`, run `npm install` then `npm run dev` to view the UI shells.
3. **Infra**
   - From `infra`, run `npm install` and `npm run build` to synthesize the CDK stack, then `cdk synth`/`cdk deploy` once AWS credentials are in place.

### Debug-first notes
- Controllers log lifecycle decisions (goal creation, snapshot writes) to simplify on-call triage.
- Resource packs upload a placeholder artifact to S3 before heavy generation to keep deployments fast and idempotent.
- Dynamo projections use deterministic keys (`GOAL#`, `TASK#`) so retries never duplicate timeline rows.
