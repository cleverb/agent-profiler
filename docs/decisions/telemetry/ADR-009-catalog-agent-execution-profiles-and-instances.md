---
status: accepted
date: 2026-05-20
decision-makers: Dudley Ablorh-Bryan
---

# Catalog agent execution profiles, observations, and instances

## Context and Problem Statement

Subagent and delegated-agent work appears in hook `raw_payload` (for example Cursor
`PreToolUse` on `Task` with `tool_input.subagent_type`) but is not queryable as a
first-class dimension. Users may change agent skills, models, and modes between
sessions; overwriting a single profile row would mis-attribute historical runs.

Agent Profiler needs a durable catalog of logical agents/subagents, append-only
configuration observations, and per-delegation execution instances linked from
`events` without re-parsing JSON on every report.

## Decision

Persist a three-layer execution catalog in SQLite:

1. **`agent_profiles`** — deduplicated logical identity (`profile_key`) per source
   and normalized specialization (for example `cursor:subagent:explore`).
2. **`agent_profile_observations`** — append-only config snapshots keyed by
   `config_fingerprint`; never update `config_json` in place.
3. **`execution_instances`** — one row per delegation run, linked to the
   observation active at start, closed on matching post/failure hooks.

Add nullable **`events.execution_instance_id`** for timeline and analytics joins.

Ingest rules (initial slice):

- **Cursor:** on `PreToolUse` for `Task` / `Subagent` (or `subagent_type` in
  `tool_input`), upsert profile + observation + open instance; stamp the event.
- **Cursor:** on `PostToolUse` / `PostToolUseFailure` with the same
  `tool_use_id`, close the open instance and stamp the event.
- **OpenCode:** when `properties.info.agent` is present, catalog as
  `actor_kind = agent` with specialization from agent/mode (not treated as
  nested subagent until transcript parent linkage exists).
- Run an idempotent data-fix to backfill catalog rows and `execution_instance_id`
  from historical Cursor `Task` / `Subagent` `raw_payload` evidence.

Non-goals (this ADR):

- Full transcript-line parent/child threading.
- Parsing user-edited `.agents/` role files from disk.
- Redacting `config_json` (stored as observed at delegation time).

## Consequences

- Good, because subagent specialization and config drift are queryable across sessions.
- Good, because mutable user settings become observation history, not silent overwrites.
- Good, because `raw_payload` remains forensic source-of-truth per ADR-007.
- Bad, because ingest and schema surface area grow.
- Bad, because cross-source parity is partial until transcript ingest lands.

## Implementation Plan

- **Affected paths:** `src/core/schema.sql`, `src/core/db.ts`,
  `src/core/agentExecution.ts`, `src/commands/hook.ts`,
  `docs/decisions/README.md`
- **Patterns to follow:** additive schema, append-only observations, hook-time
  upsert only (no watcher), idempotent `data_fix_versions` backfill.
- **Patterns to avoid:** putting volatile prompt text in `profile_key`, updating
  observation `config_json` in place, destructive migrations.

### Verification

- [x] New tables exist after `openDb` on fresh and upgraded databases.
- [x] Cursor `Task` / `Subagent` `PreToolUse` creates profile, observation, and instance.
- [x] Matching post/failure closes instance and links `execution_instance_id`.
- [x] Idempotent backfill `2026-05-20-agent-execution-catalog-v1` runs once.
- [ ] OpenCode agent cataloging covered by follow-on transcript/thread work.

## More Information

- Related: ADR-004 (derived ingest fields), ADR-007 (idempotent fixes), ADR-008
  (hook mappings).
- Transcript ingest (planned) will enrich `execution_instances` end times and
  parent/child links without replacing hook-backed instances.
