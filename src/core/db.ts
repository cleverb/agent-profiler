import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { getConfiguredDatabasePath } from "./profile.js";
import type { NormalizedAgentEvent } from "./normalize.js";
import type { WorkspaceGitMeta } from "./gitWorkspace.js";

const HOME_DIR = path.join(os.homedir(), ".agent-profiler");
const WORKSPACE_DIR = path.join(process.cwd(), ".agent-profiler");
/** Same directory as this module: `src/core` when using tsx, `dist/core` when using build + copied schema. */
const SCHEMA_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "schema.sql");

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
}

function migrateEventsSchema(db: SqliteDatabase): void {
  const columns = db.prepare(`PRAGMA table_info(events)`).all() as { name: string }[];
  const names = new Set(columns.map((c) => c.name));

  const add = (sql: string, colName: string) => {
    if (!names.has(colName)) {
      db.exec(sql);
      names.add(colName);
    }
  };

  add(`ALTER TABLE events ADD COLUMN workspace_path TEXT`, "workspace_path");
  add(`ALTER TABLE events ADD COLUMN git_repo_root TEXT`, "git_repo_root");
  add(`ALTER TABLE events ADD COLUMN git_repo_name TEXT`, "git_repo_name");
  add(`ALTER TABLE events ADD COLUMN git_branch TEXT`, "git_branch");

  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_events_workspace ON events(workspace_path, created_at)`,
  );
}

export function insertEvent(
  db: SqliteDatabase,
  event: NormalizedAgentEvent,
  payloadHash: string,
  workspaceGit: WorkspaceGitMeta,
): void {
  const stmt = db.prepare(`
    INSERT INTO events (
      created_at,
      source,
      source_event,
      repo_path,
      session_id,
      turn_id,
      model,
      role,
      estimated_input_tokens,
      estimated_output_tokens,
      estimated_total_tokens,
      payload_hash,
      raw_payload,
      workspace_path,
      git_repo_root,
      git_repo_name,
      git_branch
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    new Date().toISOString(),
    event.source,
    event.sourceEvent,
    event.repoPath ?? null,
    event.sessionId ?? null,
    event.turnId ?? null,
    event.model ?? null,
    event.role,
    event.estimatedInputTokens,
    event.estimatedOutputTokens,
    event.estimatedTotalTokens,
    payloadHash,
    JSON.stringify(event.rawPayload),
    workspaceGit.workspacePath,
    workspaceGit.gitRepoRoot,
    workspaceGit.gitRepoName,
    workspaceGit.gitBranch,
  );
}

export type StoredEventSummary = {
  createdAt: string;
  source: string;
  sourceEvent: string;
  estimatedTotalTokens: number;
};

export function getLastEventSummary(db: SqliteDatabase): StoredEventSummary | null {
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
  gitRepoRoot: string | null;
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
    .get() as { source: string; sessionId: string | null; repoPath: string | null } | undefined;

  if (!latest) return [];

  const rows = latest.sessionId
    ? db
        .prepare(
          `
          SELECT
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
            git_repo_root AS gitRepoRoot,
            git_repo_name AS gitRepoName,
            git_branch AS gitBranch
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
            git_repo_root AS gitRepoRoot,
            git_repo_name AS gitRepoName,
            git_branch AS gitBranch
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
