import type { StoredEvent } from "./db.js";
import { runContextAudit } from "./contextAudit.js";

type RedFlag = {
  severity: "HIGH" | "MEDIUM";
  title: string;
  detail: string;
  recommendation: string;
  penalty: number;
};

function parsePayload(rawPayload: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(rawPayload);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore malformed payloads
  }
  return {};
}

export function formatTokens(value: number): string {
  return `~${new Intl.NumberFormat("en-US").format(value)} tokens`;
}

function normalizeSnippet(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 160);
}

export const LARGEST_EVENTS_LIMIT = 10;

export type LastReport = {
  source: string;
  sessionKey: string;
  repo: string;
  durationMinutes: number;
  usage: {
    input: number;
    output: number;
    toolResults: number;
    toolLifecycleOutputs: number;
    shellOutput: number;
    total: number;
  };
  parity: {
    lifecycle: {
      toolRequests: number;
      toolSuccesses: number;
      toolFailures: number;
    };
    operations: Array<{
      name: string;
      count: number;
      tokens: number;
    }>;
  };
  sessionShape: {
    turns: number;
    fileEdits: number;
    shellCalls: number;
    toolCalls: number;
  };
  largestEvents: Array<{
    role: string;
    sourceEvent: string;
    estimatedTotalTokens: number;
  }>;
  efficiencyScore: number;
  redFlags: Array<{
    severity: "HIGH" | "MEDIUM";
    title: string;
    detail: string;
  }>;
  recommendations: string[];
};

type CanonicalOperation =
  | "file_mutation"
  | "shell_exec"
  | "search_or_read"
  | "mcp_call"
  | "other_tool";

function normalizeCommand(command: string): string {
  return command.trim().toLowerCase();
}

function classifyOperation(event: StoredEvent): CanonicalOperation | null {
  const payload = parsePayload(event.rawPayload);
  const tool = (event.toolCanonicalName ?? "").toLowerCase();
  const input = payload.tool_input as Record<string, unknown> | undefined;
  const commandRaw =
    typeof input?.command === "string" ? input.command : undefined;
  const command = commandRaw ? normalizeCommand(commandRaw) : "";

  if (
    tool === "apply_patch" ||
    tool === "write" ||
    tool === "edit" ||
    tool === "multiedit"
  ) {
    return "file_mutation";
  }

  if (tool === "bash" || tool === "shell") return "shell_exec";

  if (tool === "grep" || tool === "readfile" || tool === "glob") {
    return "search_or_read";
  }

  if (event.interactionKind?.startsWith("mcp_")) return "mcp_call";

  if (command) {
    if (
      /(^|\s)(apply_patch|perl\s+-pi|sed\s+-i|ed\s|tee\s+.*>|mv\s|cp\s)/.test(
        command,
      )
    ) {
      return "file_mutation";
    }
    if (/(^|\s)(rg|grep|find|sed\s+-n|cat|head|tail|ls)\b/.test(command)) {
      return "search_or_read";
    }
    return "shell_exec";
  }

  if (tool) return "other_tool";
  return null;
}

export type AnalyzeSessionOptions = {
  /** Repo root used for context audit (always-on files). */
  contextAuditRoot: string;
};

function sessionKeyLabel(first: StoredEvent): string {
  if (first.sessionId && first.sessionId.trim().length > 0) {
    return first.sessionId;
  }
  return first.repoPath ?? "(no-session-id)";
}

/**
 * Builds the same report shape as the CLI `last` command from ordered session events.
 */
export function analyzeSession(
  events: StoredEvent[],
  options: AnalyzeSessionOptions,
): LastReport | null {
  if (events.length === 0) {
    return null;
  }

  const first = events[0];
  const lastEv = events[events.length - 1];
  const start = new Date(first.createdAt).getTime();
  const end = new Date(lastEv.createdAt).getTime();
  const durationMinutes = Math.max(0, Math.round((end - start) / 60000));

  let input = 0;
  let output = 0;
  let total = 0;
  let shellOutput = 0;
  let toolResults = 0;
  let toolLifecycleOutputs = 0;
  let toolRequests = 0;
  let toolSuccesses = 0;
  let toolFailures = 0;

  const turnIds = new Set<string>();
  let fileEdits = 0;
  let shellCalls = 0;
  let toolCalls = 0;
  const fileEditCounts = new Map<string, number>();

  const redFlags: RedFlag[] = [];
  let recommendations: string[] = [];
  const shellFailureBuckets = new Map<
    string,
    { runs: number; tokenTotal: number }
  >();
  const operationBuckets = new Map<
    CanonicalOperation,
    { count: number; tokens: number }
  >();

  for (const event of events) {
    input += event.estimatedInputTokens;
    output += event.estimatedOutputTokens;
    total += event.estimatedTotalTokens;
    if (event.turnId) turnIds.add(event.turnId);

    if (event.role === "file_edit") {
      fileEdits += 1;
      const payload = parsePayload(event.rawPayload);
      const file = (payload.filePath ??
        payload.path ??
        payload.relativePath) as string | undefined;
      if (file) {
        fileEditCounts.set(file, (fileEditCounts.get(file) ?? 0) + 1);
      }
    }

    if (event.role === "shell_command") shellCalls += 1;
    if (event.role === "shell_output") {
      shellCalls += 1;
      shellOutput += event.estimatedTotalTokens;

      const payload = parsePayload(event.rawPayload);
      const command =
        typeof payload.command === "string" ? payload.command : null;
      const stderr = typeof payload.stderr === "string" ? payload.stderr : "";
      const stdout = typeof payload.stdout === "string" ? payload.stdout : "";
      const outputSnippet = normalizeSnippet(stderr || stdout);
      const looksFailed =
        outputSnippet.includes("error") ||
        outputSnippet.includes("failed") ||
        outputSnippet.includes("exception") ||
        outputSnippet.includes("traceback");

      if (command && looksFailed) {
        const key = `${normalizeSnippet(command)}|${outputSnippet}`;
        const prev = shellFailureBuckets.get(key) ?? { runs: 0, tokenTotal: 0 };
        shellFailureBuckets.set(key, {
          runs: prev.runs + 1,
          tokenTotal: prev.tokenTotal + event.estimatedTotalTokens,
        });
      }
    }
    if (event.role === "tool_call") toolCalls += 1;
    if (event.role === "tool_result" || event.role === "tool_failure")
      toolResults += event.estimatedTotalTokens;

    const isPre = event.sourceEvent === "PreToolUse";
    const isPost = event.sourceEvent === "PostToolUse";
    const isFailure = event.sourceEvent === "PostToolUseFailure";
    if (isPre) toolRequests += 1;
    if (isPost) {
      toolSuccesses += 1;
      toolLifecycleOutputs += event.estimatedTotalTokens;
    }
    if (isFailure) {
      toolFailures += 1;
      toolLifecycleOutputs += event.estimatedTotalTokens;
    }

    if (isPre || isPost || isFailure) {
      const op = classifyOperation(event);
      if (op) {
        const cur = operationBuckets.get(op) ?? { count: 0, tokens: 0 };
        operationBuckets.set(op, {
          count: cur.count + 1,
          tokens: cur.tokens + event.estimatedTotalTokens,
        });
      }
    }
  }

  let score = 100;

  const topChurn = [...fileEditCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topChurn && topChurn[1] >= 5) {
    redFlags.push({
      severity: "HIGH",
      title: "same-file churn",
      detail: `${topChurn[0]} was edited ${topChurn[1]} times.`,
      recommendation:
        "Add a focused repo rule or skill note for this file's recurring failure pattern.",
      penalty: 15,
    });
  }

  if (shellOutput > 4000) {
    redFlags.push({
      severity: "HIGH",
      title: "shell output noise",
      detail: `Shell output produced ${formatTokens(shellOutput)} in this session.`,
      recommendation:
        "Capture key test/build failures once, then summarize repeated output.",
      penalty: 12,
    });
  }

  if (toolResults > 4000) {
    redFlags.push({
      severity: "MEDIUM",
      title: "large tool result",
      detail: `Tool results produced ${formatTokens(toolResults)} in this session.`,
      recommendation:
        "Request narrower tool queries and summarize oversized tool responses.",
      penalty: 10,
    });
  }

  const worstFailureLoop = [...shellFailureBuckets.entries()].sort(
    (a, b) => b[1].runs - a[1].runs || b[1].tokenTotal - a[1].tokenTotal,
  )[0];
  if (worstFailureLoop && worstFailureLoop[1].runs >= 3) {
    redFlags.push({
      severity: "HIGH",
      title: "thrashing loop",
      detail: `A similar failing shell command looped ${worstFailureLoop[1].runs} times (${formatTokens(worstFailureLoop[1].tokenTotal)}).`,
      recommendation:
        "Pause after repeated failures, capture one root error, then adjust strategy.",
      penalty: 14,
    });
  }

  const largestPrompt = events
    .filter((e) => e.role === "user_prompt")
    .reduce((max, cur) => Math.max(max, cur.estimatedTotalTokens), 0);
  if (largestPrompt > 8000) {
    redFlags.push({
      severity: "MEDIUM",
      title: "oversized prompt",
      detail: `Largest prompt was ${formatTokens(largestPrompt)}.`,
      recommendation:
        "Split goals into smaller requests and load reference docs on demand.",
      penalty: 8,
    });
  }

  if (total > 12000 && fileEdits === 0) {
    redFlags.push({
      severity: "MEDIUM",
      title: "low-signal session",
      detail: `High observable usage (${formatTokens(total)}) with no file edits.`,
      recommendation:
        "Push for earlier implementation checkpoints instead of extended analysis.",
      penalty: 10,
    });
  }

  const contextAudit = runContextAudit(options.contextAuditRoot);
  if (contextAudit.totalEstimatedTokens > 6000) {
    redFlags.push({
      severity: "MEDIUM",
      title: "context bloat",
      detail: `Always-on instruction files estimate ${formatTokens(contextAudit.totalEstimatedTokens)}.`,
      recommendation:
        "Move large static references into on-demand skills or targeted commands.",
      penalty: 10,
    });
  }

  for (const flag of redFlags) score -= flag.penalty;
  score = Math.max(0, score);
  recommendations = [...new Set(redFlags.map((r) => r.recommendation))];
  if (recommendations.length === 0) {
    recommendations = [
      "No major waste pattern detected. Keep prompts scoped and continue tracking trends.",
    ];
  }

  const largestEvents = [...events]
    .sort((a, b) => b.estimatedTotalTokens - a.estimatedTotalTokens)
    .slice(0, LARGEST_EVENTS_LIMIT)
    .map((e) => ({
      role: e.role,
      sourceEvent: e.sourceEvent,
      estimatedTotalTokens: e.estimatedTotalTokens,
    }));

  const operationLabels: Record<CanonicalOperation, string> = {
    file_mutation: "file mutation",
    shell_exec: "shell exec",
    search_or_read: "search/read",
    mcp_call: "mcp call",
    other_tool: "other tool",
  };
  const operations = [...operationBuckets.entries()]
    .map(([op, stats]) => ({
      name: operationLabels[op],
      count: stats.count,
      tokens: stats.tokens,
    }))
    .sort((a, b) => b.tokens - a.tokens || b.count - a.count);

  return {
    source: first.source,
    sessionKey: sessionKeyLabel(first),
    repo: first.repoPath ?? options.contextAuditRoot,
    durationMinutes,
    usage: {
      input,
      output,
      toolResults,
      toolLifecycleOutputs,
      shellOutput,
      total,
    },
    sessionShape: {
      turns: turnIds.size,
      fileEdits,
      shellCalls,
      toolCalls,
    },
    parity: {
      lifecycle: {
        toolRequests,
        toolSuccesses,
        toolFailures,
      },
      operations,
    },
    largestEvents,
    efficiencyScore: score,
    redFlags: redFlags.map((flag) => ({
      severity: flag.severity,
      title: flag.title,
      detail: flag.detail,
    })),
    recommendations,
  };
}
