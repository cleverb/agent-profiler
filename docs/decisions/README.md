# Architecture Decision Records

Architecture Decision Records (ADRs) capture durable project decisions together with the context, tradeoffs, and implementation expectations needed to apply them consistently.

## Conventions

- Root directory: `docs/decisions`
- Category folders:
  - `process/` for repo workflow and governance decisions
  - `architecture/` for core product/runtime/storage decisions
  - `telemetry/` for event ingestion, metadata, and analytics model decisions
- Naming: `ADR-NNN-title-with-dashes.md`
- Numbering: global across all categories
- Status values: `proposed`, `accepted`, `rejected`, `deprecated`, `superseded`

## Workflow

1. Add a new ADR as `proposed`.
2. Discuss or revise until the decision is clear.
3. Mark it `accepted` or `rejected` once the decision is made.
4. If a later ADR replaces it, mark the older one `superseded` and link both records.

## ADR Index

| ADR                                                                                               | Title                                                                           | Category       | Status   | Date       |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------- | -------- | ---------- |
| [ADR-001](process/ADR-001-adopt-architecture-decision-records.md)                                 | Adopt architecture decision records                                             | `process`      | accepted | 2026-05-13 |
| [ADR-002](architecture/ADR-002-build-agent-profiler-as-a-local-first-cli-with-sqlite.md)          | Build Agent Profiler as a local-first CLI with SQLite                           | `architecture` | accepted | 2026-05-11 |
| [ADR-003](telemetry/ADR-003-normalize-agent-events-through-source-adapters.md)                    | Normalize agent events through source adapters                                  | `telemetry`    | accepted | 2026-05-11 |
| [ADR-004](telemetry/ADR-004-store-derived-telemetry-and-workspace-metadata.md)                    | Store derived telemetry and workspace metadata alongside raw events             | `telemetry`    | accepted | 2026-05-13 |
| [ADR-005](architecture/ADR-005-storybook-and-parameterized-dashboard-ui-components.md)            | Use Storybook and parameterized TypeScript modules for dashboard UI development | `architecture` | accepted | 2026-05-16 |
| [ADR-006](telemetry/ADR-006-disambiguate-cross-source-hook-identifiers-and-event-names.md)        | Disambiguate cross-source hook identifiers and event names                      | `telemetry`    | accepted | 2026-05-16 |
| [ADR-007](telemetry/ADR-007-manage-schema-evolution-with-provenance-and-idempotent-data-fixes.md) | Manage schema evolution with provenance and idempotent data fixes               | `telemetry`    | accepted | 2026-05-16 |
