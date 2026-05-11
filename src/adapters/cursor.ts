import { estimateTokens } from "../core/tokens.js";
import type { AgentEventRole, NormalizedAgentEvent } from "../core/normalize.js";

const cursorRoleMap: Record<string, AgentEventRole> = {
  beforeSubmitPrompt: "user_prompt",
  afterAgentResponse: "assistant_output",
  afterShellExecution: "shell_output",
  afterFileEdit: "file_edit",
  start: "session_start",
  stop: "session_stop",
};

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

function extractObservableText(payload: Record<string, unknown>): string {
  const content = pickFirstString([
    payload.prompt,
    payload.response,
    payload.output,
    payload.stderr,
    payload.stdout,
    payload.command,
    payload.text,
    payload.message,
  ]);

  if (content) return content;
  return JSON.stringify(payload);
}

export function normalizeCursorEvent(
  eventName: string,
  rawPayload: unknown,
): NormalizedAgentEvent {
  const payload = asRecord(rawPayload);
  const role = cursorRoleMap[eventName] ?? "unknown";
  const observableText = extractObservableText(payload);

  const estimatedInputTokens =
    role === "user_prompt" || role === "tool_call" || role === "shell_command"
      ? estimateTokens(observableText)
      : 0;

  const estimatedOutputTokens =
    role === "assistant_output" ||
    role === "tool_result" ||
    role === "shell_output" ||
    role === "file_edit"
      ? estimateTokens(observableText)
      : 0;

  return {
    source: "cursor",
    sourceEvent: eventName,
    repoPath: pickFirstString([payload.repoPath, payload.workspacePath]),
    sessionId: pickFirstString([payload.sessionId, payload.session]),
    turnId: pickFirstString([payload.turnId, payload.turn]),
    model: pickFirstString([payload.model, payload.modelName]),
    role,
    observableText,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedTotalTokens: estimatedInputTokens + estimatedOutputTokens,
    rawPayload,
  };
}
