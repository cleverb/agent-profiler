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

function stringifyJsonish(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  try {
    const s = JSON.stringify(value);
    return s.length > 0 ? s : undefined;
  } catch {
    return String(value);
  }
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
    typeof payload.result === "string" ? payload.result : undefined,
  ]);

  if (content) return content;

  const toolResponse = stringifyJsonish(
    payload.tool_response ?? payload.toolResponse ?? payload.result,
  );
  if (toolResponse) return toolResponse;

  const toolInput = stringifyJsonish(
    payload.tool_input ??
      payload.toolInput ??
      payload.input ??
      payload.args ??
      payload.arguments,
  );
  if (toolInput) return toolInput;

  return JSON.stringify(payload);
}

export function normalizeCursorEvent(
  eventName: string,
  rawPayload: unknown,
): NormalizedAgentEvent {
  const payload = asRecord(rawPayload);
  const mapped = resolveMappedHook(
    "cursor",
    eventName,
    pickFirstString([payload.cursor_version, payload.cursorVersion]),
  );
  const role: AgentEventRole = mapped.role;
  const observableText = extractObservableText(payload);

  const estimatedInputTokens =
    role === "user_prompt" || role === "tool_call" || role === "shell_command"
      ? estimateTokens(observableText)
      : 0;

  const estimatedOutputTokens =
    role === "assistant_output" ||
    role === "tool_result" ||
    role === "tool_failure" ||
    role === "shell_output" ||
    role === "file_edit"
      ? estimateTokens(observableText)
      : 0;

  return {
    source: "cursor",
    sourceEvent: mapped.canonicalEvent,
    repoPath: pickFirstString([payload.repoPath, payload.workspacePath]),
    sessionId: pickFirstString([
      payload.session_id,
      payload.sessionId,
      payload.session,
    ]),
    turnId: pickFirstString([
      payload.turn_id,
      payload.turnId,
      payload.turn,
      payload.generation_id,
      payload.generationId,
    ]),
    conversationId: pickFirstString([
      payload.conversation_id,
      payload.conversationId,
    ]),
    generationId: pickFirstString([
      payload.generation_id,
      payload.generationId,
    ]),
    model: pickFirstString([payload.model, payload.modelName]),
    role,
    observableText,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedTotalTokens: estimatedInputTokens + estimatedOutputTokens,
    rawPayload,
  };
}
