# Agent Profiler MVP 0.1 Handoff

We should start with a tight MVP that proves the value in one painful developer moment:

> “What just happened in my last agent session, and what should I fix?”

## Product Name

**Agent Profiler**

## Product Positioning

Agent Profiler is a local-first observability toolkit for AI coding agents. It helps developers identify context bloat, tool noise, retry loops, oversized repo instructions, and inefficient agent usage patterns across tools like Cursor, Claude Code, Codex, and MCP workflows.

## Important Framing

Agent Profiler should not claim to measure official billing or exact provider token spend.

Use this framing:

> Agent Profiler does not replace official provider billing. It profiles observable local agent behavior so teams can improve token efficiency before costs show up in dashboards.

The goal is not billing accuracy.

The goal is:

- local observability
- token hygiene
- context footprint awareness
- workflow pattern detection
- practical remediation recommendations

---

## MVP Goal

Create a local-first CLI that captures observable AI coding-agent events, stores them in SQLite, and produces a useful “last session” report.

The first major command should be:

```bash
npx agent-profiler last
```

It should answer:

```txt
What happened in my most recent agent session?
How much observable context/output/tool noise did it produce?
Were there obvious waste patterns?
What should I change?
```

This one report proves the product.

---

## Initial Supported Environment

Start with **Cursor** first because the immediate pain point is Cursor local usage, token limits, and observable agent behavior.

However, the architecture should treat Cursor as an adapter, not as the whole product.

Design for future support of:

```txt
Cursor
Claude Code
Codex
Generic CLI wrappers
MCP tools
```

---

## Core Architecture

```txt
agent-profiler/
  core/
    event schema
    SQLite store
    token estimator
    session analyzer
    red flag engine
    report generator

  adapters/
    cursor/
    claude-code/
    codex/
    generic-cli/

  dashboard/
    optional Express server later

  skills/
    cursor/
    claude-code/
    codex/
    shared/
```

The main architectural principle:

```txt
Each supported environment gets its own collector.
All collectors normalize into the same local event schema.
```

The database should not care whether an event came from Cursor, Claude Code, Codex, or another source.

---

## MVP Command Set

For version `0.1`, implement only the essentials.

```bash
agent-profiler init cursor
agent-profiler hook cursor <eventName>
agent-profiler status
agent-profiler last
agent-profiler audit context
```

### Command: `init cursor`

Purpose:

Create local configuration, local SQLite DB, and Cursor hook wiring.

It should create or update:

```txt
~/.agent-profiler/config.json
~/.agent-profiler/events.sqlite
.cursor/hooks.json or ~/.cursor/hooks.json
```

Cursor hook entries should call something like:

```bash
agent-profiler hook cursor beforeSubmitPrompt
```

### Command: `hook cursor <eventName>`

Purpose:

Read JSON from stdin, normalize the event, estimate observable token usage, and store it in SQLite.

The hook command should:

```txt
1. Read stdin
2. Parse JSON safely
3. Normalize through the Cursor adapter
4. Estimate tokens from observable text
5. Hash the raw payload
6. Insert event into SQLite
7. Exit cleanly so Cursor can continue
```

### Command: `status`

Purpose:

Show whether Agent Profiler is configured and receiving events.

Example output:

```txt
Agent Profiler Status

Database:
  ~/.agent-profiler/events.sqlite

Configured adapters:
  Cursor: yes

Last event:
  2026-05-10 19:22:41
  source: cursor
  event: afterAgentResponse
  estimated tokens: 1,842

Dashboard:
  not running
```

### Command: `last`

Purpose:

Generate a report for the most recent observed session.

This is the most important MVP command.

### Command: `audit context`

Purpose:

Scan the current repo for likely always-on agent context files and estimate their token footprint.

Files to scan initially:

```txt
AGENTS.md
CLAUDE.md
.cursorrules
.cursor/rules/**
.cursor/skills/**
.codex/config.toml
.codex/hooks.json
.claude/settings.json
.claude/commands/**
.claude/agents/**
.claude/skills/**
```

---

## Suggested Repo Structure

```txt
agent-profiler/
  package.json
  tsconfig.json
  README.md
  src/
    cli.ts

    commands/
      init.ts
      hook.ts
      status.ts
      last.ts
      auditContext.ts

    core/
      db.ts
      schema.sql
      tokens.ts
      normalize.ts
      sessions.ts
      redFlags.ts
      scoring.ts

    adapters/
      cursor.ts
      claude.ts
      codex.ts

    reporters/
      lastSessionReport.ts
```

Keep it boring and maintainable:

```txt
TypeScript
Node
SQLite
Commander
better-sqlite3
```

---

## Initial Project Setup

From the laptop:

```bash
mkdir agent-profiler
cd agent-profiler
git init
npm init -y
npm install commander better-sqlite3
npm install -D typescript tsx @types/node
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

Update `package.json`:

```json
{
  "name": "agent-profiler",
  "version": "0.1.0",
  "description": "Local-first profiling for AI coding agents.",
  "type": "module",
  "bin": {
    "agent-profiler": "./dist/cli.js"
  },
  "scripts": {
    "dev": "tsx src/cli.ts",
    "build": "tsc",
    "start": "node dist/cli.js"
  },
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## SQLite Schema, Version 1

Create `src/core/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  source TEXT NOT NULL,
  source_event TEXT NOT NULL,
  repo_path TEXT,
  session_id TEXT,
  turn_id TEXT,
  model TEXT,
  role TEXT NOT NULL,
  estimated_input_tokens INTEGER DEFAULT 0,
  estimated_output_tokens INTEGER DEFAULT 0,
  estimated_total_tokens INTEGER DEFAULT 0,
  payload_hash TEXT NOT NULL,
  raw_payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_session
ON events(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_events_source
ON events(source, created_at);
```

Do not overdesign the DB yet.

---

## Normalized Event Model

Create a shared internal shape that every adapter maps into.

```ts
export type AgentEventSource = "cursor" | "claude-code" | "codex" | "generic";

export type AgentEventRole =
  | "user_prompt"
  | "assistant_output"
  | "tool_call"
  | "tool_result"
  | "shell_command"
  | "shell_output"
  | "file_edit"
  | "session_start"
  | "session_stop"
  | "unknown";

export type NormalizedAgentEvent = {
  source: AgentEventSource;
  sourceEvent: string;
  repoPath?: string;
  sessionId?: string;
  turnId?: string;
  model?: string;
  role: AgentEventRole;
  observableText: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedTotalTokens: number;
  rawPayload: unknown;
};
```

Everything adapters do should reduce to this model.

---

## Token Estimation

Start simple.

Create `src/core/tokens.ts`:

```ts
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}
```

Do not block the MVP on perfect tokenization.

Later versions can add:

```txt
model-aware tokenizers
provider-specific estimates
cached-token approximations
tool-specific accounting
```

But version `0.1` only needs a rough observable estimate.

---

## Cursor Adapter, First Pass

Create `src/adapters/cursor.ts`.

The adapter should accept:

```txt
eventName
raw payload
```

And return a normalized event.

Initial mapping idea:

```txt
Cursor beforeSubmitPrompt  -> user_prompt
Cursor afterAgentResponse  -> assistant_output
Cursor afterShellExecution -> shell_output
Cursor afterFileEdit       -> file_edit
Cursor stop                -> session_stop
Unknown events             -> unknown
```

The adapter should defensively extract observable text from common fields:

```txt
prompt
message
response
content
command
stdout
stderr
diff
filePath
```

Do not assume Cursor payloads are stable.

Write the adapter so missing fields do not crash the hook.

---

## Hook Behavior

The hook command should be safe and quiet.

Requirements:

```txt
- Never crash Cursor if JSON parsing fails.
- Store raw payload, even if normalization is incomplete.
- Use "unknown" role when unsure.
- Always exit successfully unless there is a severe local filesystem/database issue.
- Avoid logging noisy output unless debugging is enabled.
```

Pseudo-flow:

```ts
const eventName = args.eventName;
const rawStdin = await readStdin();

let payload: unknown;

try {
  payload = JSON.parse(rawStdin);
} catch {
  payload = { _raw: rawStdin };
}

const normalized = normalizeCursorEvent(eventName, payload);
await insertEvent(normalized);
```

---

## First Report Format

The `agent-profiler last` report should look roughly like this:

```txt
Agent Profiler: Last Session

Source:
  Cursor

Repo:
  /repos/sfw-mcp-chirp

Duration:
  38 minutes

Observable usage:
  Input:        ~32,400 tokens
  Output:       ~18,900 tokens
  Tool results: ~11,200 tokens
  Shell output: ~7,800 tokens
  Total:        ~70,300 tokens

Session shape:
  Turns:        14
  File edits:   27
  Shell calls:  9
  Tool calls:   6

Efficiency score:
  64 / 100

Red flags:
  HIGH same-file churn
    ProductCard.tsx was edited 9 times.

  HIGH shell output noise
    npm test produced ~6,800 observable tokens across 4 runs.

  MEDIUM context bloat
    Always-on repo instructions estimate: ~9,400 tokens.

Recommendations:
  1. Add a focused rule for ProductCard layering and anchor semantics.
  2. Cap or summarize repeated test output before asking the agent to continue.
  3. Move long design-system references into an on-demand skill.
```

This is the heart of the product.

---

## Red Flags for MVP

Implement simple, explainable heuristics first.

### `same_file_churn`

Trigger when:

```txt
same file edited 5+ times in one session
```

### `large_shell_output`

Trigger when:

```txt
shell output exceeds 4,000 estimated tokens
```

### `large_tool_result`

Trigger when:

```txt
tool result exceeds 4,000 estimated tokens
```

### `oversized_prompt`

Trigger when:

```txt
single prompt exceeds 8,000 estimated tokens
```

### `context_bloat`

Trigger when:

```txt
repo instruction files exceed 6,000 estimated tokens
```

### `thrashing_loop`

Trigger when:

```txt
same command runs 3+ times with similar failure text
```

### `low_signal_session`

Trigger when:

```txt
high total observable tokens but few or no file edits
```

These are simple, explainable, and useful.

---

## Efficiency Score, First Pass

The score should be opinionated but transparent.

Start at `100`.

Subtract points:

```txt
- 5 to 25 points for always-on context bloat
- 5 to 20 points for repeated shell error loops
- 5 to 20 points for same-file edit thrashing
- 5 to 15 points for oversized MCP/tool responses
- 5 to 15 points for repeated tool calls with similar output
- 5 to 10 points for very large average prompt size
- 5 to 10 points for low edit-to-output ratio
```

Do not pretend the score is scientific.

Use language like:

```txt
Efficiency score: 68 / 100

Interpretation:
This was a moderately wasteful session. Most waste came from large tool responses and repeated edits to the same files.
```

---

## Context Audit

The `audit context` command should scan likely always-on or frequently referenced agent instruction files.

Initial file patterns:

```txt
AGENTS.md
CLAUDE.md
.cursorrules
.cursor/rules/**
.cursor/skills/**
.codex/config.toml
.codex/hooks.json
.claude/settings.json
.claude/commands/**
.claude/agents/**
.claude/skills/**
```

Example output:

```txt
Agent Profiler: Context Audit

Estimated always-on / agent-adjacent context:
  ~14,800 tokens

Largest contributors:
  .cursor/rules/design-system.mdc        ~5,900
  .cursor/rules/architecture.mdc         ~3,400
  AGENTS.md                              ~2,700
  .cursor/rules/testing.mdc              ~1,900

Recommendations:
  1. Move design-system.mdc into an on-demand skill unless it is needed for every task.
  2. Keep always-on rules short, direct, and behavioral.
  3. Move long examples and reference docs behind explicit commands or skills.
```

---

## Future Dashboard

Do not build this first.

Later command:

```bash
agent-profiler dashboard
```

Could launch:

```txt
http://localhost:3737
```

Future dashboard views:

```txt
Overview
  Daily observable token estimate
  Sessions by repo
  Top noisy repos
  Top noisy tools
  Recent red flags

Sessions
  Timeline of events
  Prompt/response size trends
  Tool calls
  Shell calls
  File edit churn

Repos
  Context footprint
  Rule size
  Skill usage
  Recommendations

MCP
  Tool response sizes
  Error loops
  Repeated calls
  Bloat sources

Doctor
  Hook health
  DB health
  Cursor config health
  Known limitations
```

But the MVP should prove itself through CLI reports first.

---

## Future Remediation Skills

After reporting works, add installable skills.

Possible command:

```bash
agent-profiler skills install cursor
```

Potential skills:

```txt
token-hygiene
context-audit
mcp-response-budget
rule-refactor
thrash-detection
```

Example generated recommendation file:

```md
# Agent Profiler Recommendation

## Problem

The repository appears to attach approximately 18,000 tokens of rules and reference material before the user prompt is considered.

## Evidence

- `.cursor/rules/design-system.mdc`: ~7,100 tokens
- `.cursor/rules/accessibility.mdc`: ~4,900 tokens
- `.cursor/rules/testing.mdc`: ~3,800 tokens
- `AGENTS.md`: ~2,200 tokens

## Recommendation

Split these into:

- short always-on rule summaries
- on-demand skills
- command-triggered references
- task-specific checklists

## Suggested Agent Task

Audit our Cursor rules for always-on context bloat. Preserve intent, but split large reference material into on-demand skills. Keep always-on rules under 2,000 tokens total.
```

---

## MVP Acceptance Criteria

Version `0.1` is successful when this works:

```bash
agent-profiler init cursor
```

Then the developer uses Cursor normally for one session.

Then:

```bash
agent-profiler last
```

Produces:

```txt
- estimated observable usage
- event counts
- largest events
- obvious red flags
- practical recommendations
```

That is enough to demo.

---

## First Commit

Suggested first commit:

```txt
feat: add local event store and cursor hook collector
```

Include:

```txt
- CLI shell with commander
- SQLite schema
- hook command that reads stdin
- Cursor adapter stub
- token estimator
- event insertion
- status command
```

---

## Second Commit

Suggested second commit:

```txt
feat: add last-session report with basic red flags
```

Include:

```txt
- session lookup
- event aggregation
- token totals
- red flag detection
- simple efficiency score
- text report output
```

---

## Third Commit

Suggested third commit:

```txt
feat: add repo context audit
```

Include:

```txt
- scan common agent instruction files
- estimate token footprint
- rank largest files
- generate context bloat recommendations
```

---

## Development Priority

Build in this order:

```txt
1. Package skeleton
2. SQLite setup
3. CLI shell
4. Hook command
5. Cursor adapter
6. Event insertion
7. Status command
8. Last-session report
9. Red flag detection
10. Context audit
```

Do not build the dashboard until the CLI is clearly useful.

---

## Product Language

Use this language:

```txt
Agent Profiler is a local-first profiler for AI coding agents.
It observes local agent events, estimates visible context and output size, and identifies patterns that make agent sessions expensive, noisy, or inefficient.
```

Avoid this language:

```txt
Tracks exact Cursor spend.
Measures official token billing.
Replaces provider dashboards.
Guarantees token accuracy.
```

Preferred disclaimer:

```txt
Agent Profiler estimates observable local usage. It does not replace official provider billing or admin dashboards.
```

---

## Long-Term Direction

Agent Profiler should eventually support:

```txt
Cursor
Claude Code
Codex
MCP tools
generic CLI workflows
local dashboards
installable remediation skills
team-level export
repo-level context linting
agent instruction refactoring
```

The strategic goal is to move teams from vague complaints like:

```txt
Cursor is expensive.
```

To actionable diagnosis like:

```txt
This repo has a 9,000-token always-on rule file, a noisy MCP tool returning 12,000-token responses, and an agent loop editing the same file 11 times.
```

That is the value proposition.
