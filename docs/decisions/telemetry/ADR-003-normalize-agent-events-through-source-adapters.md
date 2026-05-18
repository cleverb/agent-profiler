---
status: accepted
date: 2026-05-11
decision-makers: Dudley Ablorh-Bryan
---

# Normalize agent events through source adapters

## Context and Problem Statement

Agent Profiler starts with Cursor, but the product goal is broader than one integration. The handoff documentation explicitly treats Cursor as the first adapter rather than the whole product, and the codebase already includes separate adapter modules for Cursor and Codex. Raw hook payloads differ by tool, event name, and field shape, and those payloads are not stable enough to query directly across sources.

The reporting layer still needs one coherent internal model. Commands such as `hook`, `status`, and `last` should not need source-specific branches everywhere they touch persisted event data. At the same time, the collector cannot discard the original payload because future mapping fixes and investigations depend on raw evidence.

## Decision

Normalize provider-specific hook payloads through source adapters into one shared `NormalizedAgentEvent` model before persistence.

Concretely:

- Keep the shared event contract in `src/core/normalize.ts`.
- Implement source-specific mapping logic in `src/adapters/`.
- Dispatch to the appropriate adapter in `src/commands/hook.ts`.
- Persist the raw payload together with normalized fields so the system keeps both a query-friendly model and the original evidence.

Non-goals:

- Perfect semantic equivalence across every source from day one.
- A single heuristic parser with no provider-specific logic.
- Dropping raw payloads once normalized fields have been derived.

## Consequences

- Good, because new sources can plug into the system by implementing one adapter boundary instead of changing every report and storage path.
- Good, because downstream code can query one internal shape for roles, tokens, sessions, and source metadata.
- Good, because preserving raw payloads keeps the system debuggable when upstream hook formats change.
- Bad, because adapter logic must be maintained as external tools evolve their payload schemas.
- Bad, because some source-specific nuance will still live outside the shared model until there is a stronger cross-provider abstraction.

## Implementation Plan

- **Affected paths**: `src/adapters/`, `src/core/normalize.ts`, `src/commands/hook.ts`, `src/core/tokens.ts`, `src/core/db.ts`
- **Dependencies**: No additional runtime dependencies beyond the existing CLI and storage stack
- **Patterns to follow**: Implement one normalization function per source, keep token estimation based on extracted observable text, return safe defaults instead of throwing on missing fields, and let `hook.ts` own source dispatch rather than downstream reporters
- **Patterns to avoid**: Embedding provider-specific parsing in report commands, assuming payload fields are stable across tool versions, or treating normalized rows as a replacement for raw payload retention

### Verification

- [x] `src/core/normalize.ts` defines the shared `NormalizedAgentEvent` shape.
- [x] `src/adapters/cursor.ts` and `src/adapters/codex.ts` each map source events into that shared model.
- [x] `src/commands/hook.ts` chooses the adapter based on source before inserting rows.
- [x] Persisted events retain both normalized fields and `raw_payload` for later inspection.

## Alternatives Considered

- Source-specific tables and reports: Rejected because it would duplicate reporting logic and make cross-tool comparisons much harder.
- Parsing directly inside `hook.ts` without adapter modules: Rejected because it mixes orchestration with provider-specific mapping and becomes harder to extend.
- Storing only raw JSON and deriving everything later: Rejected because every report would need bespoke parsing and would inherit upstream payload instability.

## More Information

This decision was established in the initial implementation commit `10f767f`, which added the shared normalization type, the adapter modules, and the hook ingestion flow that routes through them.

## Implementation History

- 2026-05-16: Extended normalized event identity to include `conversationId` and `generationId` in `NormalizedAgentEvent`.
- 2026-05-16: Strengthened Cursor normalization to support snake_case payload keys (`session_id`, `turn_id`, `generation_id`, `conversation_id`) and fallback `generation_id -> turn_id`.
- 2026-05-16: Canonicalized Cursor lifecycle event names to PascalCase (`PreToolUse`, `PostToolUse`, `Stop`, etc.) so Cursor and Codex can share one lifecycle taxonomy.
- 2026-05-16: Updated hook ingest derivation flow to use normalized canonical `sourceEvent` for downstream interaction-kind derivation.
- 2026-05-16: Related cross-source disambiguation and migration governance were formalized in ADR-006 and ADR-007.
