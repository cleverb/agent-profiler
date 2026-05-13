---
status: accepted
date: 2026-05-11
decision-makers: Dudley Ablorh-Bryan
---

# Build Agent Profiler as a local-first CLI with SQLite

## Context and Problem Statement

The MVP goal for Agent Profiler is to capture observable AI coding-agent events on a developer machine, persist them locally, and generate useful reports without requiring a hosted backend. The product is meant to help individuals inspect noisy sessions, oversized context, and tool usage in the repos where they already work.

That makes low-friction local setup a hard constraint. Hook collection must work from local IDE and CLI integrations, data should remain available offline, and the first-run experience should not depend on provisioning a remote service. The storage layer also needs to support structured queries for session summaries and red-flag reporting rather than simple append-only logs.

## Decision

Implement Agent Profiler as a Node/TypeScript CLI backed by an embedded SQLite database using `better-sqlite3`.

Concretely:

- The main user interface is a CLI rooted in `src/cli.ts` with command modules under `src/commands/`.
- The default database is a local SQLite file, typically `~/.agent-profiler/events.sqlite`.
- If the preferred location is not writable, fall back to a workspace-local `.agent-profiler/events.sqlite`.
- Open the database on demand from CLI commands and apply schema plus migrations inside the process.

Non-goals:

- Multi-user hosted storage.
- A permanently running background daemon or agent profiler service.
- Requiring network connectivity to collect or inspect local sessions.

## Consequences

- Good, because install and usage stay lightweight for a single developer on a local machine.
- Good, because SQLite supports the query patterns needed for `status`, `last`, and future analytics without introducing service operations.
- Good, because local storage aligns with the project's privacy and offline-first positioning.
- Bad, because schema migration logic now lives in the CLI codebase and must stay backward-compatible with existing local databases.
- Bad, because SQLite is not the right long-term choice for centralized team analytics if the project later expands beyond local-first workflows.

## Implementation Plan

- **Affected paths**: `package.json`, `src/cli.ts`, `src/commands/`, `src/core/db.ts`, `src/core/schema.sql`, `src/core/profile.ts`
- **Dependencies**: `commander` for the CLI surface and `better-sqlite3` for embedded storage
- **Patterns to follow**: Resolve the preferred DB path from config or env, fall back to a workspace-local DB when needed, enable WAL mode when opening SQLite, and keep canonical schema in `src/core/schema.sql` with additive migrations in `src/core/db.ts`
- **Patterns to avoid**: Requiring a remote API or database before commands work, splitting persistence by adapter, or using flat files as the primary query surface for reports

### Verification

- [x] The CLI exposes command entry points from `src/cli.ts` and `src/commands/`.
- [x] `src/core/db.ts` resolves a writable SQLite path and opens the database in WAL mode.
- [x] `src/core/schema.sql` defines the persisted event store used by the reporting commands.
- [x] Initialization, ingestion, and report commands all rely on the same local database path conventions.

## Alternatives Considered

- Hosted API plus remote database: Rejected because it adds operational friction, network dependency, and privacy concerns before the local reporting workflow is proven.
- JSONL or plain text log files: Rejected because they are easy to append but poor for ad hoc querying, summarization, and incremental analytics.
- Background daemon with IPC: Rejected because it complicates installation and process management for an MVP whose hooks can write directly to a local database.

## More Information

This decision is reflected in the initial project setup commit `10f767f`, which introduced the CLI structure, SQLite dependency, schema, and core command flow.
