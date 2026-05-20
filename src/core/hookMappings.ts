import type { AgentEventRole, AgentEventSource } from "./normalize.js";

/**
 * Versioned source-hook to canonical-lifecycle mapping registry.
 * @see ADR-008
 */
export type CanonicalHookEvent =
  | "SessionStart"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PostToolUse"
  | "PostToolUseFailure"
  | "BeforeShellExecution"
  | "AfterShellExecution"
  | "BeforeReadFile"
  | "AfterFileEdit"
  | "AfterAgentThought"
  | "AfterAgentResponse"
  | "PreCompact"
  | "Stop";

export type HookMappingRule = {
  sourceEvent: string;
  canonicalEvent: CanonicalHookEvent;
  role: AgentEventRole;
};

export type HookMappingProfile = {
  profileId: string;
  versionRange: string;
  rules: HookMappingRule[];
};

export type HookMappingRegistry = Record<
  AgentEventSource,
  HookMappingProfile[]
>;

const cursorV1: HookMappingProfile = {
  profileId: "cursor-v1",
  versionRange: "*",
  rules: [
    {
      sourceEvent: "beforeSubmitPrompt",
      canonicalEvent: "UserPromptSubmit",
      role: "user_prompt",
    },
    {
      sourceEvent: "afterAgentResponse",
      canonicalEvent: "AfterAgentResponse",
      role: "assistant_output",
    },
    {
      sourceEvent: "afterAgentThought",
      canonicalEvent: "AfterAgentThought",
      role: "assistant_output",
    },
    {
      sourceEvent: "afterShellExecution",
      canonicalEvent: "AfterShellExecution",
      role: "shell_output",
    },
    {
      sourceEvent: "afterFileEdit",
      canonicalEvent: "AfterFileEdit",
      role: "file_edit",
    },
    {
      sourceEvent: "preToolUse",
      canonicalEvent: "PreToolUse",
      role: "tool_call",
    },
    {
      sourceEvent: "postToolUse",
      canonicalEvent: "PostToolUse",
      role: "tool_result",
    },
    {
      sourceEvent: "postToolUseFailure",
      canonicalEvent: "PostToolUseFailure",
      role: "tool_failure",
    },
    {
      sourceEvent: "beforeMCPExecution",
      canonicalEvent: "PreToolUse",
      role: "tool_call",
    },
    {
      sourceEvent: "afterMCPExecution",
      canonicalEvent: "PostToolUse",
      role: "tool_result",
    },
    {
      sourceEvent: "beforeShellExecution",
      canonicalEvent: "BeforeShellExecution",
      role: "shell_command",
    },
    {
      sourceEvent: "beforeReadFile",
      canonicalEvent: "BeforeReadFile",
      role: "tool_call",
    },
    {
      sourceEvent: "start",
      canonicalEvent: "SessionStart",
      role: "session_start",
    },
    {
      sourceEvent: "sessionStart",
      canonicalEvent: "SessionStart",
      role: "session_start",
    },
    { sourceEvent: "stop", canonicalEvent: "Stop", role: "session_stop" },
    { sourceEvent: "sessionEnd", canonicalEvent: "Stop", role: "session_stop" },
    {
      sourceEvent: "preCompact",
      canonicalEvent: "PreCompact",
      role: "unknown",
    },
  ],
};

const codexV1: HookMappingProfile = {
  profileId: "codex-v1",
  versionRange: "*",
  rules: [
    {
      sourceEvent: "SessionStart",
      canonicalEvent: "SessionStart",
      role: "session_start",
    },
    {
      sourceEvent: "UserPromptSubmit",
      canonicalEvent: "UserPromptSubmit",
      role: "user_prompt",
    },
    {
      sourceEvent: "PreToolUse",
      canonicalEvent: "PreToolUse",
      role: "tool_call",
    },
    {
      sourceEvent: "PostToolUse",
      canonicalEvent: "PostToolUse",
      role: "tool_result",
    },
    { sourceEvent: "Stop", canonicalEvent: "Stop", role: "session_stop" },
  ],
};

const claudeCodeV1: HookMappingProfile = {
  profileId: "claude-code-v1",
  versionRange: "*",
  rules: [
    {
      sourceEvent: "SessionStart",
      canonicalEvent: "SessionStart",
      role: "session_start",
    },
    {
      sourceEvent: "UserPromptSubmit",
      canonicalEvent: "UserPromptSubmit",
      role: "user_prompt",
    },
    {
      sourceEvent: "PreToolUse",
      canonicalEvent: "PreToolUse",
      role: "tool_call",
    },
    {
      sourceEvent: "PostToolUse",
      canonicalEvent: "PostToolUse",
      role: "tool_result",
    },
    {
      sourceEvent: "PostToolUseFailure",
      canonicalEvent: "PostToolUseFailure",
      role: "tool_failure",
    },
    { sourceEvent: "Stop", canonicalEvent: "Stop", role: "session_stop" },
  ],
};

const opencodeV1: HookMappingProfile = {
  profileId: "opencode-v1",
  versionRange: "*",
  rules: [
    {
      sourceEvent: "session.created",
      canonicalEvent: "SessionStart",
      role: "session_start",
    },
    {
      sourceEvent: "message.updated.user",
      canonicalEvent: "UserPromptSubmit",
      role: "user_prompt",
    },
    {
      sourceEvent: "message.updated.assistant",
      canonicalEvent: "AfterAgentResponse",
      role: "assistant_output",
    },
    {
      sourceEvent: "message.updated",
      canonicalEvent: "AfterAgentResponse",
      role: "assistant_output",
    },
    {
      sourceEvent: "tool.execute.before",
      canonicalEvent: "PreToolUse",
      role: "tool_call",
    },
    {
      sourceEvent: "tool.execute.after",
      canonicalEvent: "PostToolUse",
      role: "tool_result",
    },
    {
      sourceEvent: "tool.execute.failure",
      canonicalEvent: "PostToolUseFailure",
      role: "tool_failure",
    },
    {
      sourceEvent: "command.executed",
      canonicalEvent: "AfterShellExecution",
      role: "shell_output",
    },
    {
      sourceEvent: "file.edited",
      canonicalEvent: "AfterFileEdit",
      role: "file_edit",
    },
    {
      sourceEvent: "session.idle",
      canonicalEvent: "Stop",
      role: "session_stop",
    },
  ],
};

export const hookMappingRegistry: HookMappingRegistry = {
  cursor: [cursorV1],
  codex: [codexV1],
  "claude-code": [claudeCodeV1],
  opencode: [opencodeV1],
  generic: [],
};

const sourceAliases: Record<string, AgentEventSource> = {
  cursor: "cursor",
  codex: "codex",
  claude: "claude-code",
  "claude-code": "claude-code",
  opencode: "opencode",
};

export function resolveMappedHook(
  sourceInput: string,
  eventName: string,
  platformVersion?: string,
): {
  source: AgentEventSource;
  canonicalEvent: string;
  role: AgentEventRole;
  profileId: string | null;
  versionRange: string | null;
} {
  const source = sourceAliases[sourceInput] ?? "generic";

  const profiles = hookMappingRegistry[source] ?? [];
  const selected =
    selectProfile(profiles, platformVersion) ??
    profiles[profiles.length - 1] ??
    null;

  if (!selected) {
    return {
      source,
      canonicalEvent: eventName,
      role: "unknown",
      profileId: null,
      versionRange: null,
    };
  }

  const matched = findRule(selected, eventName);
  if (!matched) {
    return {
      source,
      canonicalEvent: eventName,
      role: "unknown",
      profileId: selected.profileId,
      versionRange: selected.versionRange,
    };
  }

  return {
    source,
    canonicalEvent: matched.canonicalEvent,
    role: matched.role,
    profileId: selected.profileId,
    versionRange: selected.versionRange,
  };
}

function findRule(
  profile: HookMappingProfile,
  eventName: string,
): HookMappingRule | null {
  return profile.rules.find((rule) => rule.sourceEvent === eventName) ?? null;
}

function selectProfile(
  profiles: HookMappingProfile[],
  platformVersion?: string,
): HookMappingProfile | null {
  if (!platformVersion) return profiles[0] ?? null;
  return (
    profiles.find((profile) => profile.versionRange === platformVersion) ??
    profiles[0] ??
    null
  );
}
