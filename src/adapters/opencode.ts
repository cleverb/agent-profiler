import { estimateTokens } from "../core/tokens.js";
import type {
  AgentEventRole,
  NormalizedAgentEvent,
} from "../core/normalize.js";
import { resolveMappedHook } from "../core/hookMappings.js";

function pickFirstString(values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function stringifyJsonish(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function estimateTokensForRole(
  role: AgentEventRole,
  text: string,
): { estimatedInputTokens: number; estimatedOutputTokens: number } {
  const estimatedInputTokens =
    role === "user_prompt" || role === "tool_call" || role === "shell_command"
      ? estimateTokens(text)
      : 0;
  const estimatedOutputTokens =
    role === "assistant_output" ||
    role === "tool_result" ||
    role === "tool_failure" ||
    role === "shell_output" ||
    role === "file_edit" ||
    role === "session_stop"
      ? estimateTokens(text)
      : 0;
  return { estimatedInputTokens, estimatedOutputTokens };
}

export function normalizeOpenCodeEvent(
  eventName: string,
  rawPayload: unknown,
): NormalizedAgentEvent {
  const payload = asRecord(rawPayload);
  const properties = asRecord(payload.properties);
  const info = asRecord(properties.info);
  const message = asRecord(payload.message);
  const modelInfo = asRecord(info.model);
  const pathInfo = asRecord(info.path);
  const mapped = resolveMappedHook(
    "opencode",
    pickFirstString([payload.opencode_event, payload.event_type]) ?? eventName,
    pickFirstString([payload.opencode_version, payload.app_version]),
  );

  let role: AgentEventRole = mapped.role;
  let observableText =
    pickFirstString([
      payload.prompt,
      payload.message,
      payload.text,
      payload.command,
      payload.output,
      properties.text,
      info.text,
      info.summary,
      message.text,
      message.content,
    ]) ?? "";

  if (!observableText) {
    observableText = stringifyJsonish(
      payload.tool_input ??
        payload.tool_output ??
        payload.tool_response ??
        payload.payload ??
        rawPayload,
    );
  }

  if (mapped.canonicalEvent === "AfterShellExecution") {
    role = "shell_output";
  }

  const { estimatedInputTokens, estimatedOutputTokens } = estimateTokensForRole(
    role,
    observableText,
  );

  return {
    source: "opencode",
    sourceEvent: mapped.canonicalEvent,
    repoPath: pickFirstString([
      payload.repo_path,
      payload.repoPath,
      payload.cwd,
      payload.directory,
      payload.worktree,
      pathInfo.cwd,
      pathInfo.root,
    ]),
    sessionId: pickFirstString([
      payload.session_id,
      payload.sessionId,
      payload.opencode_session_id,
      properties.sessionID,
      properties.sessionId,
      info.sessionID,
      info.sessionId,
    ]),
    turnId: pickFirstString([
      payload.turn_id,
      payload.turnId,
      payload.message_id,
      payload.generation_id,
      payload.generationId,
      info.id,
      info.parentID,
      info.parentId,
      message.id,
    ]),
    conversationId: pickFirstString([
      payload.conversation_id,
      payload.conversationId,
      properties.conversationID,
      properties.conversationId,
      info.conversationID,
      info.conversationId,
    ]),
    generationId: pickFirstString([
      payload.generation_id,
      payload.generationId,
      properties.generationID,
      properties.generationId,
      info.generationID,
      info.generationId,
    ]),
    model: pickFirstString([
      payload.model,
      info.modelID,
      info.modelId,
      modelInfo.modelID,
      modelInfo.modelId,
    ]),
    role,
    observableText,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedTotalTokens: estimatedInputTokens + estimatedOutputTokens,
    rawPayload,
  };
}
