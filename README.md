# agent-profiler

Local-first profiling for AI coding agents.

`agent-profiler` captures local Cursor and Codex hook events into SQLite so you can inspect recent sessions, setup state, and always-on context overhead without sending data to a remote service.

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

## `npx` vs `--mode prod`

- `npx agent-profiler ...` is great for one-off inspection commands.
- `agent-profiler init <source> --mode prod` writes persistent hook commands that expect `agent-profiler` to be installed on `PATH`.
- `--mode dev` is meant for local development in this repository and writes absolute `node <repo>/dist/cli.js ...` hook commands instead.

## Commands

- `agent-profiler init <cursor|codex>`: install hook wiring for a supported source
- `agent-profiler hook <source> <eventName>`: ingest one hook payload from stdin
- `agent-profiler status`: inspect local setup and ingest state
- `agent-profiler last`: summarize the most recent observed session
- `agent-profiler audit context`: estimate always-on context token footprint

## Releases

Releases are automated with semantic-release. Pull requests run CI plus canary publishing, and pushes to `main` publish to npm and create a GitHub release.
