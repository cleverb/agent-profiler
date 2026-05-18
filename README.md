# Agent Profiler

## What's New in v1.1.0

The dashboard and developer workflow got a big refresh:

- **Sharper dashboard UI** — usage gauge, efficiency sparkline, session timeline, tool histograms, and context audit in a cohesive dark-friendly layout (light mode too).
- **Storybook for dashboard components** — develop and document UI modules in isolation with `npm run storybook` (repo contributors).
- **ADRs in Storybook** — browse and search architecture decision records from the **Architecture** panel while you work on stories.
- **Light / dark themes** — toggle themes in Storybook and the shipped dashboard via shared `data-theme` tokens.
- **Stronger telemetry** — canonical cross-source hook event names, Cursor/Codex ID normalization, and safe schema evolution with provenance-backed backfills.

![Agent Profiler Dashboard](assets/dashboard.png)

![Storybook — dashboard components and ADR browser](assets/storybook.png)

**Agent Profiler** is a **local-first** tool for understanding how AI coding agents spend observable effort in your workspace. It records Cursor and Codex hook traffic into **SQLite** so you can review session shape, estimated token usage, tool and shell noise, always-on context weight, and simple efficiency signals—**without sending telemetry to a remote service.**

Today the workflow is intentionally scoped **project-by-project**: you run commands from a repo root, store profiler config and data under **`.agent-profiler/`** beside that project, and inspect sessions with the CLI or the optional dashboard. **A future direction** is to offer a clearer opt-in path to operate primarily from the **home-directory** profile (for example global installs and multi-repo DB layout) when users want that; the current release optimizes for **per-repo isolation** and predictable paths.

On **`agent-profiler init`** in **dev** mode, when the profiler directory resolves to **`<project>/.agent-profiler`**, the tool **appends a `.gitignore` rule** so the local store (including SQLite and synced dashboard assets) is **not committed** by mistake.

## Dashboard

Run a minimal **localhost-only** web UI over the same database and context audit used by `last`:

```bash
agent-profiler dashboard
# open http://127.0.0.1:3737/ — use Refresh to reload metrics
```

The dashboard surfaces:

- **Observable usage** — estimated input, output, tool/MCP result, and shell output tokens with simple bar proportions
- **Efficiency score** — heuristic score with a small sparkline over recent keyed sessions (when present)
- **Session timeline** — chronological strip colored by role (user, assistant, tool, shell, other)
- **Tool result sizes** — histogram buckets for large tool payloads
- **Context audit** — estimated tokens for common always-on instruction paths in the repo
- **Red flags and recommendations** — aligned with the `last` command logic

Static assets are copied into **`.agent-profiler/dashboard/`** when the server starts so the UI stays next to your project data.

### UI development (contributors)

Dashboard markup lives in **`packages/dashboard/src/ui/`** and is exercised in **Storybook** (not shipped in the npm package):

```bash
npm run storybook
# http://127.0.0.1:6006 — component stories, theme toolbar, Architecture (ADR) panel
```

## Requirements

- Node.js 22 or newer
- macOS, Linux, or another environment supported by `better-sqlite3`

## Install

For one-off commands, use `npx`:

```bash
npx agent-profiler --help
npx agent-profiler last
```

For persistent hook installation, install the package so `agent-profiler` is available on `PATH`:

```bash
npm install -g agent-profiler
agent-profiler --help
```

## Quick Start

Initialize hooks for Cursor:

```bash
agent-profiler init cursor --mode prod
```

Initialize hooks for Codex:

```bash
agent-profiler init codex --mode prod
```

Inspect the resulting setup and the latest captured session:

```bash
agent-profiler status
agent-profiler last
agent-profiler audit context
```

### Hook approval and restarts

- **Codex**: Hooks must be **approved** before they run—confirm when prompted or enable them in the **Codex plugin settings**.
- **Cursor**: **Restart Cursor** after `init` so hook configuration reliably takes effect.

## `npx` vs `--mode prod`

- `npx agent-profiler ...` is great for one-off inspection commands.
- `agent-profiler init <source> --mode prod` writes persistent hook commands that expect `agent-profiler` to be installed on `PATH`.
- `--mode dev` is meant for local development in this repository and writes absolute `node <repo>/dist/cli.js ...` hook commands instead.

## Commands

- `agent-profiler init <cursor|codex>`: install hook wiring for a supported source
- `agent-profiler hook <source> <eventName>`: ingest one hook payload from stdin
- `agent-profiler status`: inspect local setup and ingest state
- `agent-profiler last`: summarize the most recent observed session
- `agent-profiler dashboard`: serve the local dashboard (SQLite + context audit)
- `agent-profiler audit context`: estimate always-on context token footprint

## Releases

Releases are automated with semantic-release. Pull requests run CI plus canary publishing, and pushes to `main` publish to npm and create a GitHub release.
