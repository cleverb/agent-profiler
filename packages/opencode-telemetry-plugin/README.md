# OpenCode telemetry plugin

`@agent-profiler/opencode-telemetry-plugin` captures OpenCode plugin events and
forwards normalized payloads into Agent Profiler with:

- `agent-profiler hook opencode <event-name>`

## Install

1. Install the Agent Profiler CLI so `agent-profiler` is on `PATH`:

   ```bash
   npm install -g agent-profiler
   ```

2. Register this package in OpenCode. In the project (or global) `opencode.json`:

   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "plugin": ["@agent-profiler/opencode-telemetry-plugin"]
   }
   ```

3. If your OpenCode setup uses a local `package.json` for plugins (for example
   `.opencode/package.json`), add the dependency and install:

   ```json
   {
     "dependencies": {
       "@agent-profiler/opencode-telemetry-plugin": "^1.0.0"
     }
   }
   ```

   ```bash
   cd .opencode && npm install
   ```

4. Restart OpenCode and run a session. Data is stored under
   `<project>/.agent-profiler/events.sqlite` (same as other sources).

### Troubleshooting

- **`agent-profiler` not found** — install globally or ensure prod hooks use a CLI on `PATH`.
- **No events ingested** — check `<project>/.agent-profiler/opencode-plugin.log` for hook errors.
- **Local dev in this repo** — the plugin can fall back to `<repo>/dist/cli.js` when you run OpenCode from the agent-profiler tree.

## Captured lifecycle events

- `session.created`
- `session.idle`
- `message.updated.user`
- `message.updated.assistant`
- `tool.execute.before`
- `tool.execute.after`
- `tool.execute.failure`
- `file.edited`
- `command.executed`

## Versioning and release (maintainers)

This package is **not** tied to `agent-profiler` CLI releases. Bump `version` in
`package.json` when the plugin changes, then publish from the repository root:

```bash
npm run pack:opencode
npm publish --workspace=@agent-profiler/opencode-telemetry-plugin --access public
```

Requires npm publish access to the `@agent-profiler` scope. The CLI package
(`agent-profiler`) is released separately via semantic-release on `main`.

The plugin is intentionally minimal: it emits stable telemetry events and
version metadata so adapter mappings can be version-pinned over time. See
`docs/decisions/telemetry/ADR-008-govern-hook-mappings-as-a-versioned-telemetry-contract.md`.
