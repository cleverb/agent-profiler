import crypto from "node:crypto";
import { normalizeCodexEvent } from "../adapters/codex.js";
import { normalizeCursorEvent } from "../adapters/cursor.js";
import {
  resolveHookWorkspacePath,
  resolveWorkspaceGitMeta,
} from "../core/gitWorkspace.js";
import { getDefaultDbPath, insertEvent, openDb } from "../core/db.js";
import type { InitSource } from "./init.js";
import type { NormalizedAgentEvent } from "../core/normalize.js";

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function parseRawPayload(stdinText: string): unknown {
  const trimmed = stdinText.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    return { _unparsed: trimmed };
  }
}

function normalizeEvent(
  source: InitSource,
  eventName: string,
  rawPayload: unknown,
): NormalizedAgentEvent {
  if (source === "cursor") {
    return normalizeCursorEvent(eventName, rawPayload);
  }
  if (source === "codex") {
    return normalizeCodexEvent(eventName, rawPayload);
  }

  return {
    source: "generic",
    sourceEvent: eventName,
    role: "unknown",
    observableText: "",
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
    estimatedTotalTokens: 0,
    rawPayload,
  };
}

function hashPayload(payload: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

/** Codex Stop hook requires JSON on stdout; see OpenAI Codex hooks docs. */
function writeCodexHookAck(source: InitSource, eventName: string): void {
  if (source !== "codex" || eventName !== "Stop") return;
  process.stdout.write(`${JSON.stringify({ continue: true })}\n`);
}

export async function runHook(source: InitSource, eventName: string): Promise<void> {
  const stdinText = await readStdin();
  const rawPayload = parseRawPayload(stdinText);
  const normalized = normalizeEvent(source, eventName, rawPayload);
  const payloadHash = hashPayload(rawPayload);

  const db = openDb(getDefaultDbPath());
  try {
    const workspacePath = resolveHookWorkspacePath(normalized.repoPath, rawPayload);
    const workspaceGit = resolveWorkspaceGitMeta(workspacePath);
    insertEvent(db, normalized, payloadHash, workspaceGit);
  } finally {
    db.close();
  }

  writeCodexHookAck(source, eventName);
}
