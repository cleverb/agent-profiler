import crypto from "node:crypto";
import type { NormalizedAgentEvent } from "./normalize.js";

/** Hook adapters that emit structured telemetry (matches CLI init sources). */
export type TelemetryHookSource = "cursor" | "codex";

export type ToolSpanPhase = "pre" | "post" | "failure";

export type DerivedIngestFields = {
  /** Normalized category for analytics / future intent models. */
  interactionKind: string;
  correlationId: string | null;
  toolCanonicalName: string | null;
  mcpServer: string | null;
  mcpTool: string | null;
  payloadByteLength: number;
  /** SHA-256 of trimmed prompt text when this row is a user submission. */
  promptFingerprint: string | null;
  /** When set, row participates in `interaction_spans` merge. */
  toolPhase: ToolSpanPhase | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function pickFirstString(values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

/** Split Codex-style `mcp__server__tool` or loose `MCP: server — tool`. */
export function parseMcpToolName(canonical: string): {
  mcpServer: string | null;
  mcpTool: string | null;
} {
  const t = canonical.trim();
  if (!t) return { mcpServer: null, mcpTool: null };

  if (t.startsWith("mcp__")) {
    const parts = t.split("__").filter(Boolean);
    if (parts.length >= 3) {
      return {
        mcpServer: parts[1] ?? null,
        mcpTool: parts.slice(2).join("__") || null,
      };
    }
  }

  if (t.toLowerCase().startsWith("mcp:")) {
    const rest = t.slice(4).trim();
    const sep = rest.indexOf(":");
    if (sep > 0) {
      return {
        mcpServer: rest.slice(0, sep).trim() || null,
        mcpTool: rest.slice(sep + 1).trim() || null,
      };
    }
  }

  return { mcpServer: null, mcpTool: null };
}

function fingerprintPrompt(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return crypto.createHash("sha256").update(trimmed, "utf8").digest("hex");
}

function hookToInteractionKind(
  _source: TelemetryHookSource,
  hookEventName: string,
): { kind: string; toolPhase: ToolSpanPhase | null } {
  const canonicalMap: Record<
    string,
    { kind: string; toolPhase: ToolSpanPhase | null }
  > = {
    SessionStart: { kind: "session_start", toolPhase: null },
    UserPromptSubmit: { kind: "user_prompt_submit", toolPhase: null },
    PreToolUse: { kind: "tool_request", toolPhase: "pre" },
    PostToolUse: { kind: "tool_result_event", toolPhase: "post" },
    PostToolUseFailure: { kind: "tool_failure_event", toolPhase: "failure" },
    BeforeShellExecution: { kind: "shell_command_request", toolPhase: "pre" },
    AfterShellExecution: { kind: "shell_output", toolPhase: null },
    AfterFileEdit: { kind: "file_edit", toolPhase: null },
    BeforeReadFile: { kind: "file_read_request", toolPhase: "pre" },
    AfterAgentResponse: { kind: "model_output", toolPhase: null },
    AfterAgentThought: { kind: "model_thought", toolPhase: null },
    PreCompact: { kind: "context_compact", toolPhase: null },
    Stop: { kind: "session_stop", toolPhase: null },
  };

  const mapped = canonicalMap[hookEventName];
  if (mapped) return mapped;

  return { kind: `other:${hookEventName}`, toolPhase: null };
}

function extractCorrelationId(payload: Record<string, unknown>): string | null {
  return (
    pickFirstString([
      payload.tool_use_id,
      payload.toolUseId,
      payload.toolCallId,
      payload.callId,
      payload.id,
      payload.invocationId,
    ]) ?? null
  );
}

function extractToolCanonicalName(
  payload: Record<string, unknown>,
): string | null {
  const name =
    pickFirstString([
      payload.tool_name,
      payload.toolName,
      payload.tool,
      payload.name,
      payload.type,
    ]) ?? null;
  return name?.trim() || null;
}

/**
 * Derives query-friendly fields + MCP split + span phase for tool correlation.
 */
export function deriveIngestFields(
  source: TelemetryHookSource,
  hookEventName: string,
  rawPayload: unknown,
  rawJsonText: string,
  normalized: NormalizedAgentEvent,
): DerivedIngestFields {
  const { kind, toolPhase } = hookToInteractionKind(source, hookEventName);
  const payload = asRecord(rawPayload);
  const correlationId = extractCorrelationId(payload);
  let toolCanonicalName = extractToolCanonicalName(payload);

  if (
    !toolCanonicalName &&
    payload.tool_input &&
    typeof payload.tool_input === "object"
  ) {
    const ti = payload.tool_input as Record<string, unknown>;
    toolCanonicalName =
      pickFirstString([ti.command, ti.tool, ti.name])?.trim() ||
      toolCanonicalName;
  }

  const { mcpServer, mcpTool } = toolCanonicalName
    ? parseMcpToolName(toolCanonicalName)
    : { mcpServer: null, mcpTool: null };

  let promptFingerprint: string | null = null;
  if (kind === "user_prompt_submit") {
    const prompt =
      pickFirstString([payload.prompt, payload.text, payload.message]) ??
      normalized.observableText;
    promptFingerprint = fingerprintPrompt(prompt);
  }

  const payloadByteLength = Buffer.byteLength(rawJsonText, "utf8");

  return {
    interactionKind: kind,
    correlationId,
    toolCanonicalName,
    mcpServer,
    mcpTool,
    payloadByteLength,
    promptFingerprint,
    toolPhase,
  };
}
