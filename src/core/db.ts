import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { getConfiguredDatabasePath } from "./profile.js";
import type { DerivedIngestFields } from "./eventMetadata.js";
import type { NormalizedAgentEvent } from "./normalize.js";
import type { WorkspaceGitMeta } from "./gitWorkspace.js";

const HOME_DIR = path.join(os.homedir(), ".agent-profiler");
const WORKSPACE_DIR = path.join(process.cwd(), ".agent-profiler");
/** Same directory as this module: `src/core` when using tsx, `dist/core` when using build + copied schema. */
const SCHEMA_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "schema.sql",
);

export function getDefaultDbPath(): string {
  const fromEnv = process.env.AGENT_PROFILER_DB_PATH;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv;
  const configured = getConfiguredDatabasePath(process.cwd());
  if (configured && configured.trim().length > 0) return configured;
  return path.join(HOME_DIR, "events.sqlite");
}

type SqliteDatabase = {
  pragma(source: string): unknown;
  exec(sql: string): unknown;
  prepare(sql: string): {
    run(...params: unknown[]): unknown;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };
  close(): void;
};

type ColumnMigration = {
  name: string;
  sql: string;
};

type IngestProvenance = {
  ingestedByVersion: string;
  normalizationVersion: number;
};

export function resolveWritableDbPath(dbPath: string): string {
  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    return dbPath;
  } catch {
    const fallbackPath = path.join(WORKSPACE_DIR, "events.sqlite");
    fs.mkdirSync(path.dirname(fallbackPath), { recursive: true });
    return fallbackPath;
  }
}

export function openDb(dbPath = getDefaultDbPath()): SqliteDatabase {
  const writableDbPath = resolveWritableDbPath(dbPath);
  const db = new Database(writableDbPath) as unknown as SqliteDatabase;
  db.pragma("journal_mode = WAL");
  applySchema(db);
  return db;
}

export function resolveUsableDbPath(preferredDbPath: string): string {
  const primary = resolveWritableDbPath(preferredDbPath);
  try {
    const db = new Database(primary);
    db.pragma("journal_mode = WAL");
    db.close();
    return primary;
  } catch {
    const fallbackPath = path.join(WORKSPACE_DIR, "events.sqlite");
    fs.mkdirSync(path.dirname(fallbackPath), { recursive: true });
    const db = new Database(fallbackPath);
    db.pragma("journal_mode = WAL");
    db.close();
    return fallbackPath;
  }
}

export function applySchema(db: SqliteDatabase): void {
  const schemaSql = fs.readFileSync(SCHEMA_PATH, "utf8");
  db.exec(schemaSql);
  migrateEventsSchema(db);
  migrateInteractionSpansSchema(db);
  applyDataFidelityFixes(db);
}

function migrateTableColumns(
  db: SqliteDatabase,
  tableName: "events" | "interaction_spans",
  columnsToAdd: ColumnMigration[],
): void {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as {
    name: string;
  }[];
  const names = new Set(columns.map((c) => c.name));

  for (const column of columnsToAdd) {
    if (!names.has(column.name)) {
      db.exec(column.sql);
      names.add(column.name);
    }
  }
}

function migrateEventsSchema(db: SqliteDatabase): void {
  migrateTableColumns(db, "events", [
    {
      name: "workspace_path",
      sql: `ALTER TABLE events ADD COLUMN workspace_path TEXT`,
    },
    {
      name: "workspace_home_rel_path",
      sql: `ALTER TABLE events ADD COLUMN workspace_home_rel_path TEXT`,
    },
    {
      name: "workspace_display_path",
      sql: `ALTER TABLE events ADD COLUMN workspace_display_path TEXT`,
    },
    {
      name: "git_repo_root",
      sql: `ALTER TABLE events ADD COLUMN git_repo_root TEXT`,
    },
    {
      name: "git_repo_root_home_rel_path",
      sql: `ALTER TABLE events ADD COLUMN git_repo_root_home_rel_path TEXT`,
    },
    {
      name: "git_repo_root_display_path",
      sql: `ALTER TABLE events ADD COLUMN git_repo_root_display_path TEXT`,
    },
    {
      name: "git_repo_name",
      sql: `ALTER TABLE events ADD COLUMN git_repo_name TEXT`,
    },
    {
      name: "git_branch",
      sql: `ALTER TABLE events ADD COLUMN git_branch TEXT`,
    },
    {
      name: "interaction_kind",
      sql: `ALTER TABLE events ADD COLUMN interaction_kind TEXT`,
    },
    {
      name: "correlation_id",
      sql: `ALTER TABLE events ADD COLUMN correlation_id TEXT`,
    },
    {
      name: "tool_canonical_name",
      sql: `ALTER TABLE events ADD COLUMN tool_canonical_name TEXT`,
    },
    {
      name: "mcp_server",
      sql: `ALTER TABLE events ADD COLUMN mcp_server TEXT`,
    },
    { name: "mcp_tool", sql: `ALTER TABLE events ADD COLUMN mcp_tool TEXT` },
    {
      name: "payload_byte_length",
      sql: `ALTER TABLE events ADD COLUMN payload_byte_length INTEGER`,
    },
    {
      name: "prompt_fingerprint",
      sql: `ALTER TABLE events ADD COLUMN prompt_fingerprint TEXT`,
    },
    {
      name: "conversation_id",
      sql: `ALTER TABLE events ADD COLUMN conversation_id TEXT`,
    },
    {
      name: "generation_id",
      sql: `ALTER TABLE events ADD COLUMN generation_id TEXT`,
    },
    {
      name: "ingested_by_version",
      sql: `ALTER TABLE events ADD COLUMN ingested_by_version TEXT`,
    },
    {
      name: "normalization_version",
      sql: `ALTER TABLE events ADD COLUMN normalization_version INTEGER`,
    },
  ]);
}

function migrateInteractionSpansSchema(db: SqliteDatabase): void {
  migrateTableColumns(db, "interaction_spans", [
    {
      name: "turn_id",
      sql: `ALTER TABLE interaction_spans ADD COLUMN turn_id TEXT`,
    },
    {
      name: "conversation_id",
      sql: `ALTER TABLE interaction_spans ADD COLUMN conversation_id TEXT`,
    },
    {
      name: "generation_id",
      sql: `ALTER TABLE interaction_spans ADD COLUMN generation_id TEXT`,
    },
    {
      name: "tool_canonical_name",
      sql: `ALTER TABLE interaction_spans ADD COLUMN tool_canonical_name TEXT`,
    },
    {
      name: "mcp_server",
      sql: `ALTER TABLE interaction_spans ADD COLUMN mcp_server TEXT`,
    },
    {
      name: "mcp_tool",
      sql: `ALTER TABLE interaction_spans ADD COLUMN mcp_tool TEXT`,
    },
    {
      name: "pre_event_id",
      sql: `ALTER TABLE interaction_spans ADD COLUMN pre_event_id INTEGER`,
    },
    {
      name: "post_event_id",
      sql: `ALTER TABLE interaction_spans ADD COLUMN post_event_id INTEGER`,
    },
    {
      name: "failure_event_id",
      sql: `ALTER TABLE interaction_spans ADD COLUMN failure_event_id INTEGER`,
    },
    {
      name: "arg_token_estimate",
      sql: `ALTER TABLE interaction_spans ADD COLUMN arg_token_estimate INTEGER DEFAULT 0`,
    },
    {
      name: "result_token_estimate",
      sql: `ALTER TABLE interaction_spans ADD COLUMN result_token_estimate INTEGER DEFAULT 0`,
    },
    {
      name: "workspace_path",
      sql: `ALTER TABLE interaction_spans ADD COLUMN workspace_path TEXT`,
    },
    {
      name: "workspace_home_rel_path",
      sql: `ALTER TABLE interaction_spans ADD COLUMN workspace_home_rel_path TEXT`,
    },
    {
      name: "workspace_display_path",
      sql: `ALTER TABLE interaction_spans ADD COLUMN workspace_display_path TEXT`,
    },
    {
      name: "git_repo_root",
      sql: `ALTER TABLE interaction_spans ADD COLUMN git_repo_root TEXT`,
    },
    {
      name: "git_repo_root_home_rel_path",
      sql: `ALTER TABLE interaction_spans ADD COLUMN git_repo_root_home_rel_path TEXT`,
    },
    {
      name: "git_repo_root_display_path",
      sql: `ALTER TABLE interaction_spans ADD COLUMN git_repo_root_display_path TEXT`,
    },
    {
      name: "git_repo_name",
      sql: `ALTER TABLE interaction_spans ADD COLUMN git_repo_name TEXT`,
    },
    {
      name: "git_branch",
      sql: `ALTER TABLE interaction_spans ADD COLUMN git_branch TEXT`,
    },
    {
      name: "started_at",
      sql: `ALTER TABLE interaction_spans ADD COLUMN started_at TEXT`,
    },
    {
      name: "completed_at",
      sql: `ALTER TABLE interaction_spans ADD COLUMN completed_at TEXT`,
    },
  ]);

  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_events_workspace ON events(workspace_path, created_at)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_events_interaction_kind ON events(interaction_kind, created_at)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_events_correlation ON events(correlation_id, session_id)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_events_prompt_fingerprint ON events(prompt_fingerprint, created_at)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_spans_mcp ON interaction_spans(mcp_server, mcp_tool, started_at)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_spans_session ON interaction_spans(session_key, started_at)`,
  );
}

export function insertEvent(
  db: SqliteDatabase,
  event: NormalizedAgentEvent,
  payloadHash: string,
  workspaceGit: WorkspaceGitMeta,
  derived: DerivedIngestFields,
  provenance: IngestProvenance,
): number {
  // Keep raw payloads verbatim for forensics and stable hashes; path redaction is a
  // separate privacy decision from the derived `~/...` metadata stored alongside them.
  const rawPayloadJson = JSON.stringify(event.rawPayload);
  const stmt = db.prepare(`
    INSERT INTO events (
      created_at,
      source,
      source_event,
      repo_path,
      session_id,
      turn_id,
      conversation_id,
      generation_id,
      ingested_by_version,
      normalization_version,
      model,
      role,
      estimated_input_tokens,
      estimated_output_tokens,
      estimated_total_tokens,
      payload_hash,
      raw_payload,
      workspace_path,
      workspace_home_rel_path,
      workspace_display_path,
      git_repo_root,
      git_repo_root_home_rel_path,
      git_repo_root_display_path,
      git_repo_name,
      git_branch,
      interaction_kind,
      correlation_id,
      tool_canonical_name,
      mcp_server,
      mcp_tool,
      payload_byte_length,
      prompt_fingerprint
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    new Date().toISOString(),
    event.source,
    event.sourceEvent,
    event.repoPath ?? null,
    event.sessionId ?? null,
    event.turnId ?? null,
    event.conversationId ?? null,
    event.generationId ?? null,
    provenance.ingestedByVersion,
    provenance.normalizationVersion,
    event.model ?? null,
    event.role,
    event.estimatedInputTokens,
    event.estimatedOutputTokens,
    event.estimatedTotalTokens,
    payloadHash,
    rawPayloadJson,
    workspaceGit.workspacePath,
    workspaceGit.workspaceHomeRelPath,
    workspaceGit.workspaceDisplayPath,
    workspaceGit.gitRepoRoot,
    workspaceGit.gitRepoRootHomeRelPath,
    workspaceGit.gitRepoRootDisplayPath,
    workspaceGit.gitRepoName,
    workspaceGit.gitBranch,
    derived.interactionKind,
    derived.correlationId,
    derived.toolCanonicalName,
    derived.mcpServer,
    derived.mcpTool,
    derived.payloadByteLength,
    derived.promptFingerprint,
  ) as { lastInsertRowid: number | bigint };

  return Number(info.lastInsertRowid);
}

function hasDataFix(db: SqliteDatabase, name: string): boolean {
  const row = db
    .prepare(`SELECT 1 AS ok FROM data_fix_versions WHERE name = ? LIMIT 1`)
    .get(name) as { ok: number } | undefined;
  return Boolean(row?.ok);
}

function recordDataFix(db: SqliteDatabase, name: string): void {
  db.prepare(
    `INSERT INTO data_fix_versions (name, applied_at) VALUES (?, ?)`,
  ).run(name, new Date().toISOString());
}

function applyDataFidelityFixes(db: SqliteDatabase): void {
  const fixName = "2026-05-16-cursor-id-and-event-backfill-v1";
  if (hasDataFix(db, fixName)) return;

  db.exec(`
    UPDATE events
    SET
      session_id = COALESCE(
        NULLIF(TRIM(session_id), ''),
        NULLIF(TRIM(json_extract(raw_payload, '$.session_id')), ''),
        NULLIF(TRIM(json_extract(raw_payload, '$.sessionId')), '')
      ),
      turn_id = COALESCE(
        NULLIF(TRIM(turn_id), ''),
        NULLIF(TRIM(json_extract(raw_payload, '$.turn_id')), ''),
        NULLIF(TRIM(json_extract(raw_payload, '$.turnId')), ''),
        NULLIF(TRIM(json_extract(raw_payload, '$.generation_id')), ''),
        NULLIF(TRIM(json_extract(raw_payload, '$.generationId')), '')
      ),
      conversation_id = COALESCE(
        NULLIF(TRIM(conversation_id), ''),
        NULLIF(TRIM(json_extract(raw_payload, '$.conversation_id')), ''),
        NULLIF(TRIM(json_extract(raw_payload, '$.conversationId')), '')
      ),
      generation_id = COALESCE(
        NULLIF(TRIM(generation_id), ''),
        NULLIF(TRIM(json_extract(raw_payload, '$.generation_id')), ''),
        NULLIF(TRIM(json_extract(raw_payload, '$.generationId')), '')
      ),
      source_event = CASE source_event
        WHEN 'start' THEN 'SessionStart'
        WHEN 'sessionStart' THEN 'SessionStart'
        WHEN 'beforeSubmitPrompt' THEN 'UserPromptSubmit'
        WHEN 'preToolUse' THEN 'PreToolUse'
        WHEN 'postToolUse' THEN 'PostToolUse'
        WHEN 'postToolUseFailure' THEN 'PostToolUseFailure'
        WHEN 'beforeMCPExecution' THEN 'PreToolUse'
        WHEN 'afterMCPExecution' THEN 'PostToolUse'
        WHEN 'beforeShellExecution' THEN 'BeforeShellExecution'
        WHEN 'afterShellExecution' THEN 'AfterShellExecution'
        WHEN 'beforeReadFile' THEN 'BeforeReadFile'
        WHEN 'afterFileEdit' THEN 'AfterFileEdit'
        WHEN 'afterAgentThought' THEN 'AfterAgentThought'
        WHEN 'afterAgentResponse' THEN 'AfterAgentResponse'
        WHEN 'stop' THEN 'Stop'
        WHEN 'sessionEnd' THEN 'Stop'
        WHEN 'preCompact' THEN 'PreCompact'
        ELSE source_event
      END
    WHERE source = 'cursor'
  `);

  db.exec(`
    UPDATE events
    SET interaction_kind = CASE source_event
      WHEN 'SessionStart' THEN 'session_start'
      WHEN 'UserPromptSubmit' THEN 'user_prompt_submit'
      WHEN 'PreToolUse' THEN 'tool_request'
      WHEN 'PostToolUse' THEN 'tool_result_event'
      WHEN 'PostToolUseFailure' THEN 'tool_failure_event'
      WHEN 'BeforeShellExecution' THEN 'shell_command_request'
      WHEN 'AfterShellExecution' THEN 'shell_output'
      WHEN 'BeforeReadFile' THEN 'file_read_request'
      WHEN 'AfterFileEdit' THEN 'file_edit'
      WHEN 'AfterAgentResponse' THEN 'model_output'
      WHEN 'AfterAgentThought' THEN 'model_thought'
      WHEN 'PreCompact' THEN 'context_compact'
      WHEN 'Stop' THEN 'session_stop'
      ELSE interaction_kind
    END
    WHERE source = 'cursor'
  `);

  db.exec(`
    UPDATE interaction_spans
    SET
      turn_id = COALESCE(
        NULLIF(TRIM(turn_id), ''),
        NULLIF(TRIM((SELECT e.turn_id FROM events e WHERE e.id = pre_event_id)), ''),
        NULLIF(TRIM((SELECT e.turn_id FROM events e WHERE e.id = post_event_id)), ''),
        NULLIF(TRIM((SELECT e.turn_id FROM events e WHERE e.id = failure_event_id)), '')
      ),
      conversation_id = COALESCE(
        NULLIF(TRIM(conversation_id), ''),
        NULLIF(TRIM((SELECT e.conversation_id FROM events e WHERE e.id = pre_event_id)), ''),
        NULLIF(TRIM((SELECT e.conversation_id FROM events e WHERE e.id = post_event_id)), ''),
        NULLIF(TRIM((SELECT e.conversation_id FROM events e WHERE e.id = failure_event_id)), '')
      ),
      generation_id = COALESCE(
        NULLIF(TRIM(generation_id), ''),
        NULLIF(TRIM((SELECT e.generation_id FROM events e WHERE e.id = pre_event_id)), ''),
        NULLIF(TRIM((SELECT e.generation_id FROM events e WHERE e.id = post_event_id)), ''),
        NULLIF(TRIM((SELECT e.generation_id FROM events e WHERE e.id = failure_event_id)), '')
      )
    WHERE source = 'cursor'
  `);

  recordDataFix(db, fixName);
}

type SpanRow = {
  id: number;
  arg_token_estimate: number;
  result_token_estimate: number;
  pre_event_id: number | null;
  post_event_id: number | null;
  failure_event_id: number | null;
};

/**
 * Links pre/post/failure hook rows for the same logical tool or MCP call via correlation_id.
 */
export function mergeInteractionSpan(
  db: SqliteDatabase,
  eventId: number,
  normalized: NormalizedAgentEvent,
  workspaceGit: WorkspaceGitMeta,
  derived: DerivedIngestFields,
): void {
  if (!derived.correlationId || !derived.toolPhase) return;

  const sessionKey = normalized.sessionId ?? "";
  const source = normalized.source;
  const now = new Date().toISOString();

  const existing = db
    .prepare(
      `SELECT id, arg_token_estimate, result_token_estimate, pre_event_id, post_event_id, failure_event_id
       FROM interaction_spans
       WHERE session_key = ? AND source = ? AND correlation_id = ?`,
    )
    .get(sessionKey, source, derived.correlationId) as SpanRow | undefined;

  const argTok = Math.max(normalized.estimatedInputTokens, 0);
  const resTok = Math.max(normalized.estimatedOutputTokens, 0);

  const toolName = derived.toolCanonicalName;
  const mcpS = derived.mcpServer;
  const mcpT = derived.mcpTool;

  if (!existing) {
    const ins = db.prepare(`
      INSERT INTO interaction_spans (
        session_key, source, correlation_id, turn_id,
        conversation_id, generation_id,
        tool_canonical_name, mcp_server, mcp_tool,
        pre_event_id, post_event_id, failure_event_id,
        arg_token_estimate, result_token_estimate,
        workspace_path, workspace_home_rel_path, workspace_display_path,
        git_repo_root, git_repo_root_home_rel_path, git_repo_root_display_path,
        git_repo_name, git_branch,
        started_at, completed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    if (derived.toolPhase === "pre") {
      ins.run(
        sessionKey,
        source,
        derived.correlationId,
        normalized.turnId ?? null,
        normalized.conversationId ?? null,
        normalized.generationId ?? null,
        toolName,
        mcpS,
        mcpT,
        eventId,
        null,
        null,
        argTok,
        0,
        workspaceGit.workspacePath,
        workspaceGit.workspaceHomeRelPath,
        workspaceGit.workspaceDisplayPath,
        workspaceGit.gitRepoRoot,
        workspaceGit.gitRepoRootHomeRelPath,
        workspaceGit.gitRepoRootDisplayPath,
        workspaceGit.gitRepoName,
        workspaceGit.gitBranch,
        now,
        null,
      );
    } else if (derived.toolPhase === "post") {
      ins.run(
        sessionKey,
        source,
        derived.correlationId,
        normalized.turnId ?? null,
        normalized.conversationId ?? null,
        normalized.generationId ?? null,
        toolName,
        mcpS,
        mcpT,
        null,
        eventId,
        null,
        0,
        resTok,
        workspaceGit.workspacePath,
        workspaceGit.workspaceHomeRelPath,
        workspaceGit.workspaceDisplayPath,
        workspaceGit.gitRepoRoot,
        workspaceGit.gitRepoRootHomeRelPath,
        workspaceGit.gitRepoRootDisplayPath,
        workspaceGit.gitRepoName,
        workspaceGit.gitBranch,
        null,
        now,
      );
    } else {
      ins.run(
        sessionKey,
        source,
        derived.correlationId,
        normalized.turnId ?? null,
        normalized.conversationId ?? null,
        normalized.generationId ?? null,
        toolName,
        mcpS,
        mcpT,
        null,
        null,
        eventId,
        0,
        resTok,
        workspaceGit.workspacePath,
        workspaceGit.workspaceHomeRelPath,
        workspaceGit.workspaceDisplayPath,
        workspaceGit.gitRepoRoot,
        workspaceGit.gitRepoRootHomeRelPath,
        workspaceGit.gitRepoRootDisplayPath,
        workspaceGit.gitRepoName,
        workspaceGit.gitBranch,
        null,
        now,
      );
    }
    return;
  }

  if (derived.toolPhase === "pre") {
    db.prepare(
      `UPDATE interaction_spans SET
        pre_event_id = COALESCE(pre_event_id, ?),
        started_at = COALESCE(started_at, ?),
        arg_token_estimate = ?,
        workspace_path = COALESCE(workspace_path, ?),
        workspace_home_rel_path = COALESCE(workspace_home_rel_path, ?),
        workspace_display_path = COALESCE(workspace_display_path, ?),
        git_repo_root = COALESCE(git_repo_root, ?),
        git_repo_root_home_rel_path = COALESCE(git_repo_root_home_rel_path, ?),
        git_repo_root_display_path = COALESCE(git_repo_root_display_path, ?),
        git_repo_name = COALESCE(git_repo_name, ?),
        git_branch = COALESCE(git_branch, ?),
        tool_canonical_name = COALESCE(tool_canonical_name, ?),
        mcp_server = COALESCE(mcp_server, ?),
        mcp_tool = COALESCE(mcp_tool, ?),
        turn_id = COALESCE(turn_id, ?),
        conversation_id = COALESCE(conversation_id, ?),
        generation_id = COALESCE(generation_id, ?)
      WHERE id = ?`,
    ).run(
      eventId,
      now,
      Math.max(existing.arg_token_estimate, argTok),
      workspaceGit.workspacePath,
      workspaceGit.workspaceHomeRelPath,
      workspaceGit.workspaceDisplayPath,
      workspaceGit.gitRepoRoot,
      workspaceGit.gitRepoRootHomeRelPath,
      workspaceGit.gitRepoRootDisplayPath,
      workspaceGit.gitRepoName,
      workspaceGit.gitBranch,
      toolName,
      mcpS,
      mcpT,
      normalized.turnId ?? null,
      normalized.conversationId ?? null,
      normalized.generationId ?? null,
      existing.id,
    );
  } else if (derived.toolPhase === "post") {
    db.prepare(
      `UPDATE interaction_spans SET
        post_event_id = COALESCE(post_event_id, ?),
        completed_at = COALESCE(completed_at, ?),
        result_token_estimate = ?,
        workspace_path = COALESCE(workspace_path, ?),
        workspace_home_rel_path = COALESCE(workspace_home_rel_path, ?),
        workspace_display_path = COALESCE(workspace_display_path, ?),
        git_repo_root = COALESCE(git_repo_root, ?),
        git_repo_root_home_rel_path = COALESCE(git_repo_root_home_rel_path, ?),
        git_repo_root_display_path = COALESCE(git_repo_root_display_path, ?),
        git_repo_name = COALESCE(git_repo_name, ?),
        git_branch = COALESCE(git_branch, ?),
        tool_canonical_name = COALESCE(tool_canonical_name, ?),
        mcp_server = COALESCE(mcp_server, ?),
        mcp_tool = COALESCE(mcp_tool, ?),
        turn_id = COALESCE(turn_id, ?),
        conversation_id = COALESCE(conversation_id, ?),
        generation_id = COALESCE(generation_id, ?)
      WHERE id = ?`,
    ).run(
      eventId,
      now,
      Math.max(existing.result_token_estimate, resTok),
      workspaceGit.workspacePath,
      workspaceGit.workspaceHomeRelPath,
      workspaceGit.workspaceDisplayPath,
      workspaceGit.gitRepoRoot,
      workspaceGit.gitRepoRootHomeRelPath,
      workspaceGit.gitRepoRootDisplayPath,
      workspaceGit.gitRepoName,
      workspaceGit.gitBranch,
      toolName,
      mcpS,
      mcpT,
      normalized.turnId ?? null,
      normalized.conversationId ?? null,
      normalized.generationId ?? null,
      existing.id,
    );
  } else {
    db.prepare(
      `UPDATE interaction_spans SET
        failure_event_id = COALESCE(failure_event_id, ?),
        completed_at = COALESCE(completed_at, ?),
        result_token_estimate = ?,
        workspace_path = COALESCE(workspace_path, ?),
        workspace_home_rel_path = COALESCE(workspace_home_rel_path, ?),
        workspace_display_path = COALESCE(workspace_display_path, ?),
        git_repo_root = COALESCE(git_repo_root, ?),
        git_repo_root_home_rel_path = COALESCE(git_repo_root_home_rel_path, ?),
        git_repo_root_display_path = COALESCE(git_repo_root_display_path, ?),
        git_repo_name = COALESCE(git_repo_name, ?),
        git_branch = COALESCE(git_branch, ?),
        tool_canonical_name = COALESCE(tool_canonical_name, ?),
        mcp_server = COALESCE(mcp_server, ?),
        mcp_tool = COALESCE(mcp_tool, ?),
        turn_id = COALESCE(turn_id, ?),
        conversation_id = COALESCE(conversation_id, ?),
        generation_id = COALESCE(generation_id, ?)
      WHERE id = ?`,
    ).run(
      eventId,
      now,
      Math.max(existing.result_token_estimate, resTok),
      workspaceGit.workspacePath,
      workspaceGit.workspaceHomeRelPath,
      workspaceGit.workspaceDisplayPath,
      workspaceGit.gitRepoRoot,
      workspaceGit.gitRepoRootHomeRelPath,
      workspaceGit.gitRepoRootDisplayPath,
      workspaceGit.gitRepoName,
      workspaceGit.gitBranch,
      toolName,
      mcpS,
      mcpT,
      normalized.turnId ?? null,
      normalized.conversationId ?? null,
      normalized.generationId ?? null,
      existing.id,
    );
  }
}

export type StoredEventSummary = {
  createdAt: string;
  source: string;
  sourceEvent: string;
  estimatedTotalTokens: number;
};

export function getLastEventSummary(
  db: SqliteDatabase,
): StoredEventSummary | null {
  const row = db
    .prepare(
      `
      SELECT
        created_at AS createdAt,
        source,
        source_event AS sourceEvent,
        estimated_total_tokens AS estimatedTotalTokens
      FROM events
      ORDER BY created_at DESC
      LIMIT 1
      `,
    )
    .get() as StoredEventSummary | undefined;

  return row ?? null;
}

export type StoredEvent = {
  id: number;
  createdAt: string;
  source: string;
  sourceEvent: string;
  repoPath: string | null;
  sessionId: string | null;
  turnId: string | null;
  model: string | null;
  role: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedTotalTokens: number;
  rawPayload: string;
  workspacePath: string | null;
  workspaceHomeRelPath: string | null;
  workspaceDisplayPath: string | null;
  gitRepoRoot: string | null;
  gitRepoRootHomeRelPath: string | null;
  gitRepoRootDisplayPath: string | null;
  gitRepoName: string | null;
  gitBranch: string | null;
};

export function getEventsForLatestSession(db: SqliteDatabase): StoredEvent[] {
  const latest = db
    .prepare(
      `
      SELECT source, session_id AS sessionId, repo_path AS repoPath
      FROM events
      ORDER BY created_at DESC
      LIMIT 1
      `,
    )
    .get() as
    | { source: string; sessionId: string | null; repoPath: string | null }
    | undefined;

  if (!latest) return [];

  const rows = latest.sessionId
    ? db
        .prepare(
          `
          SELECT
${STORED_EVENT_SELECT}
          FROM events
          WHERE source = ? AND session_id = ?
          ORDER BY created_at ASC, id ASC
          `,
        )
        .all(latest.source, latest.sessionId)
    : db
        .prepare(
          `
          SELECT
${STORED_EVENT_SELECT}
          FROM events
          WHERE source = ? AND repo_path IS ?
          ORDER BY created_at DESC, id DESC
          LIMIT 200
          `,
        )
        .all(latest.source, latest.repoPath ?? null)
        .reverse();

  return rows as StoredEvent[];
}

const STORED_EVENT_SELECT = `
          id,
          created_at AS createdAt,
          source,
          source_event AS sourceEvent,
          repo_path AS repoPath,
          session_id AS sessionId,
          turn_id AS turnId,
          model,
          role,
          estimated_input_tokens AS estimatedInputTokens,
          estimated_output_tokens AS estimatedOutputTokens,
          estimated_total_tokens AS estimatedTotalTokens,
          raw_payload AS rawPayload,
          workspace_path AS workspacePath,
          workspace_home_rel_path AS workspaceHomeRelPath,
          workspace_display_path AS workspaceDisplayPath,
          git_repo_root AS gitRepoRoot,
          git_repo_root_home_rel_path AS gitRepoRootHomeRelPath,
          git_repo_root_display_path AS gitRepoRootDisplayPath,
          git_repo_name AS gitRepoName,
          git_branch AS gitBranch
`;

export type LatestSessionDescriptor = {
  source: string;
  sessionId: string | null;
  repoPath: string | null;
};

export function getLatestSessionDescriptor(
  db: SqliteDatabase,
): LatestSessionDescriptor | null {
  const latest = db
    .prepare(
      `
      SELECT source, session_id AS sessionId, repo_path AS repoPath
      FROM events
      ORDER BY created_at DESC
      LIMIT 1
      `,
    )
    .get() as LatestSessionDescriptor | undefined;

  return latest ?? null;
}

export type RecentSessionRow = {
  source: string;
  sessionId: string;
  repoPath: string | null;
  startedAt: string;
  endedAt: string;
  eventCount: number;
};

export function listRecentSessions(
  db: SqliteDatabase,
  limit: number,
): RecentSessionRow[] {
  const rows = db
    .prepare(
      `
      SELECT
        source AS source,
        session_id AS sessionId,
        MAX(repo_path) AS repoPath,
        MIN(created_at) AS startedAt,
        MAX(created_at) AS endedAt,
        COUNT(*) AS eventCount
      FROM events
      WHERE session_id IS NOT NULL AND LENGTH(TRIM(session_id)) > 0
      GROUP BY source, session_id
      ORDER BY endedAt DESC
      LIMIT ?
      `,
    )
    .all(limit) as RecentSessionRow[];

  return rows;
}

export function getEventsForSession(
  db: SqliteDatabase,
  source: string,
  sessionId: string,
): StoredEvent[] {
  const rows = db
    .prepare(
      `
          SELECT
      ${STORED_EVENT_SELECT}
          FROM events
          WHERE source = ? AND session_id = ?
          ORDER BY created_at ASC, id ASC
          `,
    )
    .all(source, sessionId);

  return rows as StoredEvent[];
}

/** Latest window used when session_id is absent (matches getEventsForLatestSession fallback). */
export function getEventsForLegacyRepoWindow(
  db: SqliteDatabase,
  source: string,
  repoPath: string | null,
): StoredEvent[] {
  const rows = db
    .prepare(
      `
          SELECT
      ${STORED_EVENT_SELECT}
          FROM events
          WHERE source = ? AND repo_path IS ?
          ORDER BY created_at DESC, id DESC
          LIMIT 200
          `,
    )
    .all(source, repoPath ?? null);

  return (rows as StoredEvent[]).reverse();
}

export type TimelineEventRow = {
  id: number;
  createdAt: string;
  role: string;
  turnId: string | null;
  estimatedTotalTokens: number;
  sourceEvent: string;
};

export function getSessionTimeline(
  db: SqliteDatabase,
  source: string,
  sessionId: string,
): TimelineEventRow[] {
  const rows = db
    .prepare(
      `
      SELECT
        id,
        created_at AS createdAt,
        role,
        turn_id AS turnId,
        estimated_total_tokens AS estimatedTotalTokens,
        source_event AS sourceEvent
      FROM events
      WHERE source = ? AND session_id = ?
      ORDER BY created_at ASC, id ASC
      `,
    )
    .all(source, sessionId);

  return rows as TimelineEventRow[];
}

export function getLegacyRepoTimeline(
  db: SqliteDatabase,
  source: string,
  repoPath: string | null,
): TimelineEventRow[] {
  const rows = db
    .prepare(
      `
      SELECT
        id,
        created_at AS createdAt,
        role,
        turn_id AS turnId,
        estimated_total_tokens AS estimatedTotalTokens,
        source_event AS sourceEvent
      FROM events
      WHERE source = ? AND repo_path IS ?
      ORDER BY created_at DESC, id DESC
      LIMIT 200
      `,
    )
    .all(source, repoPath ?? null);

  return (rows as TimelineEventRow[]).reverse();
}
