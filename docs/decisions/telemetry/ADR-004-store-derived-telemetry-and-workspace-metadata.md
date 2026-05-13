---
status: accepted
date: 2026-05-13
decision-makers: Dudley Ablorh-Bryan
---

# Store derived telemetry and workspace metadata alongside raw events

## Context and Problem Statement

The initial normalized event model is enough to persist source, role, tokens, and raw payloads, but it is not enough to answer the questions Agent Profiler is supposed to answer next. The project needs to identify tool-heavy turns, correlate pre/post tool activity, distinguish MCP usage, fingerprint repeated prompts, and report by workspace or repository without reparsing heterogeneous raw JSON on every read.

Two constraints shape this decision. First, hook ingestion must stay fast and resilient because it runs inline with developer tooling. Second, the local SQLite store may already exist on disk, so schema evolution needs to be additive and safe for existing users. Workspace and git context are also best-effort signals: some events will not come from a git repository, and some payloads will not include a clean working directory.

## Decision

Derive query-oriented telemetry fields and workspace/git metadata at ingest time, then persist those fields alongside raw events and interaction spans.

Concretely:

- Compute derived ingest fields such as interaction kind, correlation ID, tool canonical name, MCP server/tool, payload byte length, prompt fingerprint, and tool phase in `src/core/eventMetadata.ts`.
- Resolve workspace and git metadata in `src/core/gitWorkspace.ts`.
- Persist those fields on both `events` and `interaction_spans`.
- Use additive column migrations in `src/core/db.ts` so existing SQLite databases remain usable.

Non-goals:

- Redacting or transforming raw payloads beyond the existing derived display fields.
- Building a full distributed tracing system.
- Requiring every event to have git metadata or a correlation ID.

## Consequences

- Good, because reports can query stable, source-agnostic columns instead of reparsing raw JSON repeatedly.
- Good, because correlation IDs and tool phases allow the project to reconstruct logical tool spans across multiple hook events.
- Good, because workspace and repository metadata support repo-level reporting for developers who work across many projects.
- Bad, because the schema becomes wider and migration logic becomes more complex.
- Bad, because some metadata duplicates information that could theoretically be re-derived later, increasing local storage usage.

## Implementation Plan

- **Affected paths**: `src/core/eventMetadata.ts`, `src/core/gitWorkspace.ts`, `src/core/db.ts`, `src/core/schema.sql`, `src/commands/hook.ts`
- **Dependencies**: No new third-party dependencies; continue using built-in Node utilities plus the existing SQLite layer
- **Patterns to follow**: Derive metadata once during ingest, allow nulls for best-effort fields, keep raw payloads verbatim for forensics, and evolve the schema with additive migrations plus supporting indexes
- **Patterns to avoid**: Recomputing metadata ad hoc in each report, destructive migrations against existing local databases, or assuming every payload has stable tool IDs and absolute workspace paths

### Verification

- [x] `src/core/eventMetadata.ts` derives interaction kind, correlation, MCP, payload size, and prompt fingerprint fields.
- [x] `src/core/gitWorkspace.ts` resolves workspace and git metadata without requiring every event to be inside a repo.
- [x] `src/core/schema.sql` and `src/core/db.ts` persist and migrate the derived telemetry and workspace columns on `events` and `interaction_spans`.
- [x] `src/commands/hook.ts` derives and writes metadata before calling `mergeInteractionSpan`.

## Alternatives Considered

- Parse raw payloads on read for every report: Rejected because it pushes complexity into each query path and makes analytics slower and more brittle.
- Store derived metadata in separate side tables only: Rejected because it adds join complexity before the project has enough scale to justify it.
- Keep only `repo_path` from the normalized event: Rejected because it is not enough to analyze workspace-relative behavior, git roots, branch context, or tool spans across repos.

## More Information

This decision is reflected in commits `32b5104` and `c1f8eb6`, which introduced derived ingest metadata, span correlation fields, additive schema migrations, and richer workspace/repository context on persisted records.
