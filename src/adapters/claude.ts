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
): {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
} {
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

export function normalizeClaudeEvent(
  eventName: string,
  rawPayload: unknown,
): NormalizedAgentEvent {
  const payload = asRecord(rawPayload);
  // Prefer the configured hook event name from the CLI invocation (`eventName`),
  // because payload casing can drift (`stop` vs `Stop`) across runtimes.
  const sourceEventName =
    pickFirstString([eventName, payload.hook_event_name]) ?? eventName;
  const mapped = resolveMappedHook(
    "claude-code",
    sourceEventName,
    pickFirstString([payload.claude_version, payload.claudeVersion]),
  );

  let role: AgentEventRole = mapped.role;
  let observableText = "";

  switch (mapped.canonicalEvent) {
    case "SessionStart": {
      role = "session_start";
      observableText = pickFirstString([payload.source, payload.cwd]) ?? "";
      break;
    }
    case "UserPromptSubmit": {
      role = "user_prompt";
      observableText = pickFirstString([payload.prompt, payload.text]) ?? "";
      break;
    }
    case "PreToolUse": {
      role = "tool_call";
      const toolName =
        pickFirstString([payload.tool_name, payload.toolName]) ?? "";
      observableText = [toolName, stringifyJsonish(payload.tool_input)]
        .filter(Boolean)
        .join("\n");
      break;
    }
    case "PostToolUse": {
      const toolName = (
        pickFirstString([payload.tool_name, payload.toolName]) ?? ""
      ).trim();
      const responseStr = stringifyJsonish(payload.tool_response);
      observableText = [toolName, responseStr].filter(Boolean).join("\n");
      if (toolName.toLowerCase() === "bash") {
        role = "shell_output";
      } else {
        role = "tool_result";
      }
      break;
    }
    case "PostToolUseFailure": {
      role = "tool_failure";
      observableText = stringifyJsonish(
        payload.error ?? payload.tool_response ?? payload.tool_output,
      );
      break;
    }
    case "Stop": {
      role = "session_stop";
      observableText =
        pickFirstString([payload.last_assistant_message, payload.message]) ??
        "";
      break;
    }
    default: {
      observableText = stringifyJsonish(rawPayload);
    }
  }

  const { estimatedInputTokens, estimatedOutputTokens } = estimateTokensForRole(
    role,
    observableText,
  );

  return {
    source: "claude-code",
    sourceEvent: mapped.canonicalEvent,
    repoPath: pickFirstString([
      payload.cwd,
      payload.repo_path,
      payload.repoPath,
    ]),
    sessionId: pickFirstString([payload.session_id, payload.sessionId]),
    turnId: pickFirstString([
      payload.turn_id,
      payload.turnId,
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
    model: pickFirstString([payload.model]),
    role,
    observableText,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedTotalTokens: estimatedInputTokens + estimatedOutputTokens,
    rawPayload,
  };
}
