import crypto from "node:crypto";
import { normalizeClaudeEvent } from "../adapters/claude.js";
import { normalizeCodexEvent } from "../adapters/codex.js";
import { normalizeCursorEvent } from "../adapters/cursor.js";
import { normalizeOpenCodeEvent } from "../adapters/opencode.js";
import {
  resolveHookWorkspacePath,
  resolveWorkspaceGitMeta,
} from "../core/gitWorkspace.js";
import {
  deriveIngestFields,
  type TelemetryHookSource,
} from "../core/eventMetadata.js";
import {
  getDefaultDbPath,
  getLatestSessionCarryForwardContext,
  insertEvent,
  mergeInteractionSpan,
  openDb,
} from "../core/db.js";
import type { InitSource } from "./init.js";
import type { NormalizedAgentEvent } from "../core/normalize.js";
import { getIngestVersion } from "../core/packageMeta.js";

const NORMALIZATION_VERSION = 2;

/**
 * Applies safe session-level carry-forward fields when current payload omits them.
 * @see ADR-008
 */
function applySessionCarryForward(
  normalized: NormalizedAgentEvent,
  prior: {
    model: string | null;
    repoPath: string | null;
    conversationId: string | null;
  },
): NormalizedAgentEvent {
  return {
    ...normalized,
    model: normalized.model ?? prior.model ?? undefined,
    repoPath: normalized.repoPath ?? prior.repoPath ?? undefined,
    conversationId:
      normalized.conversationId ?? prior.conversationId ?? undefined,
  };
}

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

export type HookSource = InitSource | "opencode";

function normalizeEvent(
  source: HookSource,
  eventName: string,
  rawPayload: unknown,
): NormalizedAgentEvent {
  if (source === "cursor") {
    return normalizeCursorEvent(eventName, rawPayload);
  }
  if (source === "codex") {
    return normalizeCodexEvent(eventName, rawPayload);
  }
  if (source === "claude") {
    return normalizeClaudeEvent(eventName, rawPayload);
  }
  if (source === "opencode") {
    return normalizeOpenCodeEvent(eventName, rawPayload);
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
function writeCodexHookAck(source: HookSource, eventName: string): void {
  if (source !== "codex" || eventName !== "Stop") return;
  process.stdout.write(`${JSON.stringify({ continue: true })}\n`);
}

export async function runHook(
  source: HookSource,
  eventName: string,
): Promise<void> {
  const stdinText = await readStdin();
  const rawPayload = parseRawPayload(stdinText);
  const normalized = normalizeEvent(source, eventName, rawPayload);
  const payloadHash = hashPayload(rawPayload);

  const db = openDb(getDefaultDbPath());
  try {
    const priorContext =
      normalized.sessionId && normalized.sessionId.trim().length > 0
        ? getLatestSessionCarryForwardContext(
            db,
            normalized.source,
            normalized.sessionId,
          )
        : { model: null, repoPath: null, conversationId: null };
    const carried = applySessionCarryForward(normalized, priorContext);

    const workspacePath = resolveHookWorkspacePath(
      carried.repoPath,
      rawPayload,
    );
    const workspaceGit = resolveWorkspaceGitMeta(workspacePath);
    const derived = deriveIngestFields(
      carried.source as TelemetryHookSource,
      carried.sourceEvent,
      rawPayload,
      stdinText,
      carried,
    );
    const eventId = insertEvent(
      db,
      carried,
      payloadHash,
      workspaceGit,
      derived,
      {
        ingestedByVersion: getIngestVersion(),
        normalizationVersion: NORMALIZATION_VERSION,
      },
    );
    mergeInteractionSpan(db, eventId, carried, workspaceGit, derived);
  } finally {
    db.close();
  }

  writeCodexHookAck(source, eventName);
}
