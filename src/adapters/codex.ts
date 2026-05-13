import { estimateTokens } from "../core/tokens.js";
import type { AgentEventRole, NormalizedAgentEvent } from "../core/normalize.js";

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

function stringifyToolPayload(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function estimateTokensForRole(role: AgentEventRole, text: string): {
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

export function normalizeCodexEvent(
  eventName: string,
  rawPayload: unknown,
): NormalizedAgentEvent {
  const payload = asRecord(rawPayload);
  const cwd = pickFirstString([payload.cwd]);
  const sessionId = pickFirstString([payload.session_id]);
  const turnId = pickFirstString([payload.turn_id]);
  const model = pickFirstString([payload.model]);

  let role: AgentEventRole = "unknown";
  let observableText = "";

  switch (eventName) {
    case "SessionStart": {
      role = "session_start";
      observableText = pickFirstString([payload.source]) ?? "";
      break;
    }
    case "UserPromptSubmit": {
      role = "user_prompt";
      observableText = pickFirstString([payload.prompt]) ?? "";
      break;
    }
    case "PreToolUse": {
      role = "tool_call";
      const toolName = pickFirstString([payload.tool_name]) ?? "";
      observableText = [toolName, stringifyToolPayload(payload.tool_input)]
        .filter(Boolean)
        .join("\n");
      break;
    }
    case "PostToolUse": {
      const toolName = (pickFirstString([payload.tool_name]) ?? "").trim();
      const responseStr = stringifyToolPayload(payload.tool_response);
      observableText = [toolName, responseStr].filter(Boolean).join("\n");
      const lower = toolName.toLowerCase();
      if (toolName === "Bash" || lower === "bash") {
        role = "shell_output";
      } else if (
        toolName === "apply_patch" ||
        toolName === "Edit" ||
        toolName === "Write"
      ) {
        role = "file_edit";
      } else {
        role = "tool_result";
      }
      break;
    }
    case "Stop": {
      role = "session_stop";
      observableText = pickFirstString([payload.last_assistant_message]) ?? "";
      break;
    }
    default: {
      observableText = stringifyToolPayload(rawPayload);
    }
  }

  const { estimatedInputTokens, estimatedOutputTokens } = estimateTokensForRole(
    role,
    observableText,
  );

  return {
    source: "codex",
    sourceEvent: eventName,
    repoPath: cwd,
    sessionId,
    turnId,
    model,
    role,
    observableText,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedTotalTokens: estimatedInputTokens + estimatedOutputTokens,
    rawPayload,
  };
}
