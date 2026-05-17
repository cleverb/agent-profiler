---
status: accepted
date: 2026-05-16
decision-makers: Dudley Ablorh-Bryan
---

# Manage schema evolution with provenance and idempotent data fixes

## Context and Problem Statement

Agent Profiler persists long-lived local SQLite data across CLI upgrades. Additive column migrations preserve compatibility, but they are not enough when normalization logic changes and previously ingested rows can be improved using retained `raw_payload` evidence.

Recent telemetry work introduced canonical event-name mapping and stronger Cursor ID normalization (`session_id`, `turn_id` fallback from `generation_id`, and `conversation_id`). Existing installations can contain older rows that are semantically incomplete even though the needed source values remain present in `raw_payload`.

The project needs a repeatable way to evolve schema and data fidelity without destructive rewrites.

## Decision

Adopt a two-track evolution model:

- Keep schema changes additive and backward-compatible.
- Run explicit, idempotent data-fix jobs for historical remediation after schema migration.

Record provenance on each ingested row so targeted remediation remains possible:

- `events.ingested_by_version`: the CLI build/dev version that ingested the row.
- `events.normalization_version`: monotonic adapter-normalization version stamp.

Track remediation execution in a dedicated table:

- `data_fix_versions(name, applied_at)` with unique `name` per fix.

Also maintain a `schema_versions` table for explicit schema migration tracking as migration orchestration evolves.

## Consequences

- Good, because existing installations can be repaired in place when normalization improves.
- Good, because provenance allows selective backfills and safer future remediations.
- Good, because idempotent fix tracking avoids repeated heavy updates.
- Bad, because migration/runtime code grows more complex.
- Bad, because remediation SQL must be carefully tested to avoid unintended updates.

## Implementation Plan

- **Affected paths**: `src/core/schema.sql`, `src/core/db.ts`, `src/core/packageMeta.ts`, `src/commands/hook.ts`
- **Patterns to follow**: Add columns/tables without dropping old ones, design data-fix jobs to be re-runnable, and stamp ingest provenance at write time.
- **Patterns to avoid**: One-off manual SQL instructions outside the CLI lifecycle, destructive migrations, or untracked backfills.

### Verification

- [x] `events` includes `ingested_by_version` and `normalization_version`.
- [x] `schema_versions` and `data_fix_versions` tables exist.
- [x] Hook ingest stamps each new row with ingest and normalization provenance.
- [x] At least one named idempotent remediation executes and records itself:
  - `2026-05-16-cursor-id-and-event-backfill-v1`

## Alternatives Considered

- Schema-only additive migrations with no data remediation: Rejected because semantic quality of historical rows would remain inconsistent.
- Full table rewrite on every normalization change: Rejected due to risk, runtime cost, and local reliability concerns.
- Store provenance only in logs: Rejected because row-level targeting needs queryable database fields.

## More Information

This ADR formalizes the operational practice implemented after ADR-006 so local databases can evolve safely and regain fidelity over time from `raw_payload` source-of-truth data.
