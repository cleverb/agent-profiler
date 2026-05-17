---
layout: layout.njk
title: Getting started
description: Install Agent Profiler, initialize a local workspace profile, and inspect the dashboard.
permalink: /getting-started/
---

# Getting started

Agent Profiler runs locally and writes normalized session telemetry to SQLite. Use the static docs here as a quick path from install to inspection.

## 1. Install or run the CLI

```sh
npm install -g agent-profiler
agent-profiler --help
```

For repository development, install dependencies and run the TypeScript entry point:

```sh
npm ci
npm run dev -- --help
```

## 2. Initialize profiling

Run the init command in the workspace you want to profile:

```sh
agent-profiler init
```

The CLI prepares local storage and hook configuration so supported agent events can be normalized into a workspace profile.

## 3. Inspect local signals

Use the dashboard command to review estimated usage, session timelines, red flags, and recommendations:

```sh
agent-profiler dashboard
```

The deployed `/dashboard/` path contains the static dashboard shell. Runtime data still comes from the local CLI server when you run Agent Profiler on your machine.

## 4. Keep context lean

Profile results are most useful when you compare sessions over time. Watch for tool responses that are too large, shell commands that produce repeated output, and always-on context files that should be summarized or removed.
