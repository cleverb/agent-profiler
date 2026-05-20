import crypto from "node:crypto";
import type {
  DerivedIngestFields,
  TelemetryHookSource,
} from "./eventMetadata.js";
import type { NormalizedAgentEvent } from "./normalize.js";

export type AgentActorKind = "main" | "subagent" | "delegated_tool" | "agent";

export type DelegationIngestAction = "start" | "end";

/** Normalized delegation context extracted at hook ingest. */
export type DelegationExtract = {
  action: DelegationIngestAction;
  profileKey: string;
  actorKind: AgentActorKind;
  specialization: string;
  displayLabel: string | null;
  configSnapshot: Record<string, unknown>;
  configFingerprint: string;
  delegationCorrelationId: string;
  transcriptPath: string | null;
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

function normalizeSpecialization(value: string | undefined): string {
  const trimmed = (value ?? "").trim().toLowerCase();
  if (!trimmed) return "unknown";
  return trimmed.replace(/\s+/g, "-");
}

function stableConfigFingerprint(snapshot: Record<string, unknown>): string {
  const keys = Object.keys(snapshot).sort();
  const normalized: Record<string, unknown> = {};
  for (const key of keys) {
    normalized[key] = snapshot[key];
  }
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(normalized), "utf8")
    .digest("hex");
}

function buildProfileKey(
  source: string,
  actorKind: AgentActorKind,
  specialization: string,
): string {
  return `${source}:${actorKind}:${specialization}`;
}

function truncateLabel(text: string, max = 240): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function extractCursorDelegation(
  hookEventName: string,
  payload: Record<string, unknown>,
  derived: DerivedIngestFields,
): DelegationExtract | null {
  const toolInput = asRecord(payload.tool_input ?? payload.toolInput);
  const toolName = (derived.toolCanonicalName ?? "").trim();
  const subagentType = pickFirstString([
    toolInput.subagent_type,
    toolInput.subagentType,
  ]);
  const isTaskFamily =
    toolName === "Task" || toolName === "Subagent" || Boolean(subagentType);

  if (!isTaskFamily) return null;

  const specialization = normalizeSpecialization(
    subagentType ?? (toolName === "Subagent" ? "subagent" : "task"),
  );
  const actorKind: AgentActorKind =
    toolName === "Subagent" || subagentType ? "subagent" : "delegated_tool";
  const profileKey = buildProfileKey("cursor", actorKind, specialization);

  const configSnapshot: Record<string, unknown> = {
    tool_name: toolName || null,
    subagent_type: subagentType ?? null,
    model: pickFirstString([toolInput.model, payload.model]) ?? null,
    readonly:
      typeof toolInput.readonly === "boolean" ? toolInput.readonly : null,
  };
  const configFingerprint = stableConfigFingerprint(configSnapshot);

  const description = pickFirstString([
    toolInput.description,
    toolInput.prompt,
  ]);
  const displayLabel = description ? truncateLabel(description) : null;

  const correlationId = derived.correlationId;
  if (!correlationId) return null;

  const transcriptPath =
    pickFirstString([payload.transcript_path, payload.transcriptPath]) ?? null;

  if (hookEventName === "PreToolUse" && derived.toolPhase === "pre") {
    return {
      action: "start",
      profileKey,
      actorKind,
      specialization,
      displayLabel,
      configSnapshot,
      configFingerprint,
      delegationCorrelationId: correlationId,
      transcriptPath,
    };
  }

  if (
    (hookEventName === "PostToolUse" ||
      hookEventName === "PostToolUseFailure") &&
    (derived.toolPhase === "post" || derived.toolPhase === "failure")
  ) {
    return {
      action: "end",
      profileKey,
      actorKind,
      specialization,
      displayLabel,
      configSnapshot,
      configFingerprint,
      delegationCorrelationId: correlationId,
      transcriptPath,
    };
  }

  return null;
}

function extractOpenCodeAgentCatalog(
  hookEventName: string,
  payload: Record<string, unknown>,
): DelegationExtract | null {
  const properties = asRecord(payload.properties);
  const info = asRecord(properties.info);
  const sessionId = pickFirstString([
    properties.sessionID,
    properties.sessionId,
    info.sessionID,
    info.sessionId,
    payload.session_id,
    payload.sessionId,
  ]);
  if (!sessionId) return null;

  const delegationCorrelationId = `opencode-session:${sessionId}`;
  const agent = pickFirstString([info.agent, info.agentName]);

  if (hookEventName === "Stop") {
    const mode = pickFirstString([info.mode, payload.mode]);
    const specialization = normalizeSpecialization(
      agent ? (mode ? `${agent}:${mode}` : agent) : "session",
    );
    const actorKind: AgentActorKind = "agent";
    const profileKey = buildProfileKey("opencode", actorKind, specialization);
    const configSnapshot: Record<string, unknown> = {
      agent: agent ?? null,
      mode: mode ?? null,
    };
    return {
      action: "end",
      profileKey,
      actorKind,
      specialization,
      displayLabel: agent ?? null,
      configSnapshot,
      configFingerprint: stableConfigFingerprint(configSnapshot),
      delegationCorrelationId,
      transcriptPath: null,
    };
  }

  if (!agent) return null;

  const mode = pickFirstString([info.mode, payload.mode]);
  const specialization = normalizeSpecialization(
    mode ? `${agent}:${mode}` : agent,
  );
  const actorKind: AgentActorKind = "agent";
  const profileKey = buildProfileKey("opencode", actorKind, specialization);

  const configSnapshot: Record<string, unknown> = {
    agent,
    mode: mode ?? null,
    model: pickFirstString([info.modelID, info.modelId, payload.model]) ?? null,
  };
  const configFingerprint = stableConfigFingerprint(configSnapshot);

  if (hookEventName === "SessionStart") {
    return {
      action: "start",
      profileKey,
      actorKind,
      specialization,
      displayLabel: agent,
      configSnapshot,
      configFingerprint,
      delegationCorrelationId,
      transcriptPath: null,
    };
  }

  return null;
}

/**
 * Extracts delegation/catalog context from a hook payload when recognized.
 * @see ADR-009
 */
export function extractDelegationContext(
  source: TelemetryHookSource | string,
  hookEventName: string,
  rawPayload: unknown,
  derived: DerivedIngestFields,
): DelegationExtract | null {
  const payload = asRecord(rawPayload);

  if (source === "cursor") {
    return extractCursorDelegation(hookEventName, payload, derived);
  }

  if (source === "opencode") {
    return extractOpenCodeAgentCatalog(hookEventName, payload);
  }

  return null;
}

/** Reconstruct delegation extract from a stored event row (data-fix / tests). */
export function extractDelegationFromStoredEvent(input: {
  source: string;
  sourceEvent: string;
  rawPayload: unknown;
  correlationId: string | null;
  toolCanonicalName: string | null;
}): DelegationExtract | null {
  const derived: DerivedIngestFields = {
    interactionKind: "tool_request",
    correlationId: input.correlationId,
    toolCanonicalName: input.toolCanonicalName,
    mcpServer: null,
    mcpTool: null,
    payloadByteLength: 0,
    promptFingerprint: null,
    toolPhase:
      input.sourceEvent === "PreToolUse"
        ? "pre"
        : input.sourceEvent === "PostToolUse"
          ? "post"
          : input.sourceEvent === "PostToolUseFailure"
            ? "failure"
            : null,
  };

  return extractDelegationContext(
    input.source as TelemetryHookSource,
    input.sourceEvent,
    input.rawPayload,
    derived,
  );
}

export type AgentExecutionLinkContext = {
  normalized: NormalizedAgentEvent;
  hookEventName: string;
};
