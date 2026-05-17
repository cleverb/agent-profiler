# AGENTS.md

This repository is a decision-aware codebase.  
Humans and agents must preserve intent, not just produce code.

## Purpose

Use this file as the operating contract for agentic work in this repo:

- Preserve architectural intent across changes
- Keep decisions discoverable and enforceable
- Prefer safe, minimal, reversible implementation slices

## Decision System

The decision graph in this repo is:

1. `docs/decisions/**` (ADRs): the source of architectural intent
2. Code annotations/comments: where decisions are anchored in implementation
3. Skills/commands (when present): executable guidance
4. Reviews/checks: enforcement and drift detection

If these layers conflict, ADRs win.

## ADR Rules

- Always check relevant ADRs before non-trivial code changes.
- Add or update an ADR when behavior, architecture, telemetry semantics, or migration policy changes.
- ADRs must include:
  - status
  - date
  - decision-makers
  - context/problem
  - decision
  - consequences
  - implementation plan
  - verification checklist
- Keep ADR index current: `docs/decisions/README.md`.
- For consequential follow-on work, append `Implementation History` in the original ADR and link related ADRs.

## Change Design Rules

- Prefer additive, backward-compatible schema evolution.
- Do not delete persisted columns unless explicitly planned in a dedicated migration ADR.
- Use idempotent data-fix backfills for fidelity repairs from `raw_payload` when possible.
- Track migration/remediation execution in durable tables.
- Store provenance needed for future remediation targeting.

## Telemetry Normalization Rules

- Keep raw payloads immutable (`raw_payload` is source-of-truth evidence).
- Normalize cross-source lifecycle events to canonical names before analytics.
- Distinguish:
  - lifecycle semantics (`PreToolUse`, `PostToolUse`, `PostToolUseFailure`)
  - operation semantics (shell, file mutation, search/read, etc.)
- Avoid double-counting success/failure events.
- Prefer parity metrics that compare equivalent lifecycle phases across sources.

## Annotation Rules

For load-bearing or transitional code, add concise intent markers:

- Why this exists now
- What ADR governs it (for example `ADR-006`)
- What future state/migration is expected

Use short comments near the affected logic; do not add noisy boilerplate.

### ADR Annotation Convention (Required)

When referencing ADRs in TypeScript/JavaScript doc comments, use JSDoc `@see` tags.

Preferred:

```ts
/**
 * Observable usage total + caption column.
 * @see ADR-005
 */
```

Avoid:

```ts
/**
 * Observable usage total + caption column (ADR-005).
 */
```

Notes:

- Keep the summary sentence clean and separate from ADR references.
- Use one `@see` line per ADR when multiple ADRs apply.
- Prefer this convention consistently in `packages/dashboard/src/**` and `src/**`.

## Agent Workflow

Before editing:

1. Identify relevant ADR(s)
2. Confirm constraints and non-goals
3. Choose smallest safe implementation slice

While editing:

1. Keep changes scoped and reversible
2. Preserve backward compatibility unless ADR explicitly allows breakage
3. Update docs/ADR verification checklists as needed

After editing:

1. Run typecheck/build/tests relevant to scope
2. Validate data/reporting parity if telemetry paths changed
3. Record consequential decision history in ADRs

## Escalation Conditions

Stop and escalate to the user when:

- ADR guidance is missing or ambiguous for a high-impact change
- Two valid strategies conflict with existing accepted ADRs
- A fix requires destructive migration or data loss risk
- Observed payload reality contradicts current normalization assumptions

## Boundaries

- Do not silently refactor “inconsistent” legacy code that may be transitional.
- Do not replace source-specific nuance with false equivalence.
- Do not treat generated metrics as exact model context-window truth; label them as estimates when appropriate.

## Definition of Done (Agentic)

A change is done when:

- Code compiles and checks pass for scope
- Decision intent is preserved and discoverable
- ADRs/index/history are updated when consequential
- Cross-source behavior is comparable without hidden counting bias
