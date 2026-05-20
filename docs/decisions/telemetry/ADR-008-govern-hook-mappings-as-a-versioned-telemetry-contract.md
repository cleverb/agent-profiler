---
status: accepted
date: 2026-05-20
decision-makers: Dudley Ablorh-Bryan
---

# Govern hook mappings as a versioned telemetry contract

## Context and Problem Statement

ADR-003 established source adapters and ADR-006 tightened canonical event naming.
As platform support expands to Claude and OpenCode, one missing layer remains:
an explicit and discoverable mapping contract that states:

- which lifecycle hooks are telemetry-critical,
- how each source hook maps into canonical lifecycle events and roles, and
- how mappings evolve when upstream platform versions change.

Without a version-aware mapping contract, adapter logic drifts into code only,
making it harder to explain behavior to users and harder to safely pin older
platform versions to legacy mapping rules.

## Decision

Adopt a central Hook Mappings contract that is version-aware and shared by code
and documentation:

- Keep canonical lifecycle names stable (`SessionStart`, `UserPromptSubmit`,
  `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `Stop`, and supplemental
  canonical events used for shell/file/thought signals).
- Define provider mapping profiles in one registry keyed by source and
  version range.
- Resolve each incoming source event through the registry before deriving
  normalized role and canonical `source_event`.
- Preserve `raw_payload` unchanged so remapping remains possible when
  mappings are updated.
- Keep the user-facing documentation concise (high-level table) while this ADR
  and the registry remain the detailed source of truth.

Carry-forward policy for missing values:

| Field                                     | Carry-forward | Scope   | Notes                                                                    |
| ----------------------------------------- | ------------- | ------- | ------------------------------------------------------------------------ |
| `model`                                   | Yes           | session | Fill from latest non-empty value for same `source + session_id`.         |
| `repo_path`                               | Yes           | session | Enables consistent workspace and branch derivation across sparse events. |
| `conversation_id`                         | Yes           | session | Keep conversation continuity when omitted by intermediate hooks.         |
| `turn_id`                                 | Limited       | turn    | Prefer explicit correlation IDs; avoid broad session carry-forward.      |
| `generation_id`                           | Limited       | turn    | Carry only when high-confidence pairing exists.                          |
| `role` / `source_event` / token estimates | No            | event   | Event-specific semantics must remain row-local.                          |

Non-goals:

- Perfect one-to-one semantic equivalence for every platform hook.
- Coupling mapping profiles to destructive migrations.
- Replacing source-specific nuance with a lowest-common-denominator model.

## Consequences

- Good, because adapter behavior is explainable and testable from one contract.
- Good, because version pinning can be additive (`new profile`) instead of
  risky in-place rewrites.
- Good, because users can understand canonical lifecycle telemetry with a short
  public mapping table.
- Bad, because mapping profile maintenance becomes a first-class ongoing task.
- Bad, because some events still require heuristic role assignment on top of
  canonical lifecycle mapping.

## Implementation Plan

- **Affected paths**:
  - `src/core/hookMappings.ts`
  - `src/adapters/cursor.ts`
  - `src/adapters/codex.ts`
  - `src/adapters/claude.ts`
  - `src/adapters/opencode.ts`
  - `src/commands/hook.ts`
  - `src/commands/init.ts`
  - `src/commands/status.ts`
  - `src/cli.ts`
  - `README.md`
  - `packages/opencode-telemetry-plugin/`
- **Patterns to follow**:
  - Additive mapping profiles (`platform + version range + rules`)
  - Canonical lifecycle first, source-specific enrichment second
  - Keep adapter output and docs aligned with the same canonical names
  - Retain raw payload evidence for historical remapping and forensic checks
- **Patterns to avoid**:
  - Duplicating mapping tables across multiple unrelated modules
  - Query-time ad-hoc event-name normalization
  - Breaking existing reports by changing canonical names without migration path

### Verification

- [x] Mapping registry exists with source + version profile structure.
- [x] Cursor, Codex, Claude, and OpenCode adapters resolve lifecycle mapping
      through the contract.
- [x] Claude is a first-class init/status source.
- [x] OpenCode ingestion path is available through a dedicated plugin workspace.
- [x] User docs include a concise mapping view that links back to ADR detail.

## Alternatives Considered

- Keep mapping logic embedded independently per adapter:
  Rejected because cross-source drift becomes hard to detect.
- Keep all mapping details only in ADR prose:
  Rejected because adapters still need executable contract code.
- Derive mapping entirely at query time from raw payload:
  Rejected because downstream analytics and status flows need stable ingest-time
  canonical fields.

## More Information

This ADR extends ADR-003 and ADR-006 by formalizing mapping governance and
version pinning as a standalone concern.

## Implementation History

- 2026-05-20: Added centralized hook mapping registry and connected Cursor,
  Codex, Claude, and OpenCode adapter normalization to it.
- 2026-05-20: Added full Claude init/status wiring and created a reusable
  OpenCode telemetry plugin workspace package.
- 2026-05-20: Added idempotent OpenCode payload backfill
  (`2026-05-20-opencode-properties-backfill-v1`) to repair historical nested
  `properties.*` identity fields (for example `sessionID`) into first-class
  normalized event columns.
