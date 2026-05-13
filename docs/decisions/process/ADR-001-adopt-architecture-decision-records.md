---
status: accepted
date: 2026-05-13
decision-makers: Dudley Ablorh-Bryan
---

# Adopt architecture decision records

## Context and Problem Statement

Important project decisions were already starting to land in code, commit messages, and handoff notes, but not in a durable format that future contributors can scan quickly. That is especially risky in this repository because the project is explicitly about AI coding-agent workflows: future changes will often be made by agents that need self-contained, repo-local reasoning rather than informal history.

The project also needs a decision log that scales beyond a single flat directory. Even in the early commits there are already process, architecture, and telemetry choices worth preserving. If ADRs stay unstructured, they will become harder to browse as the project grows.

## Decision

Adopt numbered Architecture Decision Records in `docs/decisions/`, organized by category folders and indexed from the root `README.md`.

Concretely:

- Keep ADR numbering global across all categories.
- Store ADRs under concern-based folders such as `process/`, `architecture/`, and `telemetry/`.
- Use the root `docs/decisions/README.md` as the canonical ADR index with a table of records.
- Write ADRs as self-contained implementation guides with explicit consequences, affected paths, and verification criteria.

Non-goals:

- Replacing issue tracking or long-form design docs.
- Capturing routine implementation details that are easy to reverse.

## Consequences

- Good, because important decisions become discoverable in the repo alongside the code they govern.
- Good, because future agents can read a single ADR and understand both the rationale and the implementation boundaries.
- Good, because category folders keep the decision log browsable as the repository grows.
- Bad, because the team now owns ongoing ADR hygiene: new decisions need numbering, categorization, and index updates.
- Bad, because retrospective ADRs require some judgment when reconstructing intent from commit history.

## Implementation Plan

- **Affected paths**: `docs/decisions/README.md`, `docs/decisions/process/`, and future ADR files under category folders in `docs/decisions/`
- **Dependencies**: None
- **Patterns to follow**: Use filenames of the form `ADR-NNN-title-with-dashes.md`, keep numbering global across categories, and update the root README index whenever an ADR is added, moved, or superseded
- **Patterns to avoid**: Mixing numbered and date-prefixed filenames, leaving accepted ADRs only discoverable by path traversal, or creating new root-level ADR files once category folders are in use

### Verification

- [x] `docs/decisions/README.md` documents the category scheme and global numbering rules.
- [x] Accepted ADRs live under category folders rather than only at the ADR root.
- [x] The ADR index table links to every accepted ADR currently in the repository.

## Alternatives Considered

- No formal decision log: Rejected because architectural intent would remain implicit in commits and code comments.
- External wiki or note-taking tool: Rejected because it would drift from the codebase and be harder for agents to consult during implementation.
- Flat `docs/decisions/` directory: Rejected because the project already has enough distinct decision areas to benefit from lightweight grouping.

## More Information

This ADR establishes the conventions used by the retrospective ADRs added from the early project history. Revisit the category scheme if the current folders become too broad or too granular.
