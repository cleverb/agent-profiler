# OpenCode telemetry plugin

`@agent-profiler/opencode-telemetry-plugin` captures OpenCode plugin events and
forwards normalized payloads into Agent Profiler with:

- `agent-profiler hook opencode <event-name>`

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

## Example `opencode.json`

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@agent-profiler/opencode-telemetry-plugin"]
}
```

The plugin is intentionally minimal: it emits stable telemetry events and
version metadata so adapter mappings can be version-pinned over time.

## Versioning and release

This package is **not** tied to `agent-profiler` CLI releases. The plugin changes
infrequently, so it uses its own semver and is published manually when needed.

```bash
# from the repository root
npm pack --workspace=@agent-profiler/opencode-telemetry-plugin --dry-run
npm publish --workspace=@agent-profiler/opencode-telemetry-plugin --access public
```

Bump `version` in `package.json` (patch/minor/major) before publishing. Requires
npm access to the `@agent-profiler` scope.
