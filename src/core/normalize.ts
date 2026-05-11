export type AgentEventSource = "cursor" | "claude-code" | "codex" | "generic";

export type AgentEventRole =
  | "user_prompt"
  | "assistant_output"
  | "tool_call"
  | "tool_result"
  | "shell_command"
  | "shell_output"
  | "file_edit"
  | "session_start"
  | "session_stop"
  | "unknown";

export type NormalizedAgentEvent = {
  source: AgentEventSource;
  sourceEvent: string;
  repoPath?: string;
  sessionId?: string;
  turnId?: string;
  model?: string;
  role: AgentEventRole;
  observableText: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedTotalTokens: number;
  rawPayload: unknown;
};
