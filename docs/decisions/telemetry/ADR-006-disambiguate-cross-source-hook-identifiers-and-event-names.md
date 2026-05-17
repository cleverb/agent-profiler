---
status: accepted
date: 2026-05-16
decision-makers: Dudley Ablorh-Bryan
---

# Disambiguate cross-source hook identifiers and event names

## Context and Problem Statement

`events.raw_payload` confirms meaningful schema differences between Cursor and Codex hook payloads that make cross-source queries ambiguous unless IDs and hook names are normalized more strictly.

Observed in local data:

- Codex rows consistently include `session_id` and usually `turn_id`, with lifecycle names like `PostToolUse`.
- Cursor rows consistently include `session_id`, `generation_id`, and `conversation_id`, but often no `turn_id`, with lifecycle names like `postToolUse`.
- Existing Cursor normalization preferred camelCase (`sessionId`, `turnId`) and therefore left many normalized ID columns blank for current snake_case payloads.

Without explicit disambiguation, reports and comparisons lose continuity across sessions/turns and cannot reliably identify new chat boundaries (`conversation_id`).

## Decision

Adopt a canonical hook identity model at ingest time while preserving raw payloads unchanged:

- Normalize source event names into canonical PascalCase lifecycle names in `source_event` (for example, Cursor `postToolUse` -> `PostToolUse`).
- Treat `generation_id` as the Cursor fallback for canonical `turn_id` when `turn_id` is absent.
- Persist `conversation_id` and `generation_id` as first-class columns on `events` and `interaction_spans`.
- Continue storing `raw_payload` verbatim for forensics and forward-compatible remapping.

## Consequences

- Good, because Codex/Cursor lifecycle events can be queried with one canonical event taxonomy.
- Good, because Cursor session and turn continuity become measurable even when payloads omit `turn_id`.
- Good, because conversation resets can be analyzed explicitly via `conversation_id`.
- Bad, because canonicalizing `source_event` changes semantics for new rows and requires care when comparing against older rows.
- Bad, because `generation_id -> turn_id` is a pragmatic equivalence, not guaranteed semantic identity across all Cursor versions.

## Implementation Plan

- **Affected paths**: `src/adapters/cursor.ts`, `src/adapters/codex.ts`, `src/core/normalize.ts`, `src/core/schema.sql`, `src/core/db.ts`, `src/core/eventMetadata.ts`, `src/commands/hook.ts`
- **Patterns to follow**: Keep raw payload immutable, normalize with source adapters, and add schema migrations for new ID columns.
- **Patterns to avoid**: Querying critical identifiers only via JSON extraction from `raw_payload`, or assuming source-specific casing is query-stable.

### Verification

- [x] New Cursor ingests populate `events.session_id` from snake_case payloads.
- [x] New Cursor ingests populate `events.turn_id` via `turn_id` or fallback `generation_id`.
- [x] New ingests persist `events.conversation_id` and `events.generation_id`.
- [x] New Cursor/Codex tool lifecycle rows use canonical `source_event` values (`PreToolUse`, `PostToolUse`, etc.).

## Alternatives Considered

- Keep only raw source event names and derive canonical names at query time: Rejected because it duplicates mapping logic across reports.
- Keep `generation_id` only in `raw_payload`: Rejected because it forces JSON extraction for core analytics.
- Add source-specific ID columns only for Cursor: Rejected because the system needs a stable cross-source contract.

## More Information

This decision extends ADR-003 (source adapters) and ADR-004 (derived telemetry columns) by tightening canonical ID and event-name semantics based on observed production payloads.
