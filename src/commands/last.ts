import { getDefaultDbPath, getEventsForLatestSession, openDb } from "../core/db.js";
import { runContextAudit } from "../core/contextAudit.js";

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

function formatTokens(value: number): string {
  return `~${new Intl.NumberFormat("en-US").format(value)} tokens`;
}

function formatDuration(mins: number): string {
  return mins < 1 ? "<1 minute" : `${mins} minute${mins === 1 ? "" : "s"}`;
}

function normalizeSnippet(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 160);
}

const LARGEST_EVENTS_LIMIT = 10;

export type LastReport = {
  source: string;
  repo: string;
  durationMinutes: number;
  usage: {
    input: number;
    output: number;
    toolResults: number;
    shellOutput: number;
    total: number;
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
  redFlags: Array<{ severity: "HIGH" | "MEDIUM"; title: string; detail: string }>;
  recommendations: string[];
};

export function getLastReport(): LastReport | null {
  const db = openDb(getDefaultDbPath());
  const events = getEventsForLatestSession(db);
  db.close();

  if (events.length === 0) {
    return null;
  }

  const first = events[0];
  const last = events[events.length - 1];
  const start = new Date(first.createdAt).getTime();
  const end = new Date(last.createdAt).getTime();
  const durationMinutes = Math.max(0, Math.round((end - start) / 60000));

  let input = 0;
  let output = 0;
  let total = 0;
  let shellOutput = 0;
  let toolResults = 0;

  const turnIds = new Set<string>();
  let fileEdits = 0;
  let shellCalls = 0;
  let toolCalls = 0;
  const fileEditCounts = new Map<string, number>();

  const redFlags: RedFlag[] = [];
  let recommendations: string[] = [];
  const shellFailureBuckets = new Map<string, { runs: number; tokenTotal: number }>();

  for (const event of events) {
    input += event.estimatedInputTokens;
    output += event.estimatedOutputTokens;
    total += event.estimatedTotalTokens;
    if (event.turnId) turnIds.add(event.turnId);

    if (event.role === "file_edit") {
      fileEdits += 1;
      const payload = parsePayload(event.rawPayload);
      const file = (payload.filePath ?? payload.path ?? payload.relativePath) as
        | string
        | undefined;
      if (file) {
        fileEditCounts.set(file, (fileEditCounts.get(file) ?? 0) + 1);
      }
    }

    if (event.role === "shell_command") shellCalls += 1;
    if (event.role === "shell_output") {
      shellCalls += 1;
      shellOutput += event.estimatedTotalTokens;

      const payload = parsePayload(event.rawPayload);
      const command = typeof payload.command === "string" ? payload.command : null;
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
    if (event.role === "tool_result") toolResults += event.estimatedTotalTokens;
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
      recommendation: "Capture key test/build failures once, then summarize repeated output.",
      penalty: 12,
    });
  }

  if (toolResults > 4000) {
    redFlags.push({
      severity: "MEDIUM",
      title: "large tool result",
      detail: `Tool results produced ${formatTokens(toolResults)} in this session.`,
      recommendation: "Request narrower tool queries and summarize oversized tool responses.",
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
      recommendation: "Pause after repeated failures, capture one root error, then adjust strategy.",
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
      recommendation: "Split goals into smaller requests and load reference docs on demand.",
      penalty: 8,
    });
  }

  if (total > 12000 && fileEdits === 0) {
    redFlags.push({
      severity: "MEDIUM",
      title: "low-signal session",
      detail: `High observable usage (${formatTokens(total)}) with no file edits.`,
      recommendation: "Push for earlier implementation checkpoints instead of extended analysis.",
      penalty: 10,
    });
  }

  const contextAudit = runContextAudit(process.cwd());
  if (contextAudit.totalEstimatedTokens > 6000) {
    redFlags.push({
      severity: "MEDIUM",
      title: "context bloat",
      detail: `Always-on instruction files estimate ${formatTokens(contextAudit.totalEstimatedTokens)}.`,
      recommendation: "Move large static references into on-demand skills or targeted commands.",
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

  return {
    source: first.source,
    repo: first.repoPath ?? process.cwd(),
    durationMinutes,
    usage: { input, output, toolResults, shellOutput, total },
    sessionShape: {
      turns: turnIds.size,
      fileEdits,
      shellCalls,
      toolCalls,
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

export function runLast(): void {
  const report = getLastReport();
  if (!report) {
    console.log("Agent Profiler: Last Session\n\nNo events captured yet.");
    return;
  }

  const lines: string[] = [];
  lines.push("Agent Profiler: Last Session");
  lines.push("");
  lines.push("Source:");
  lines.push(`  ${report.source}`);
  lines.push("");
  lines.push("Repo:");
  lines.push(`  ${report.repo}`);
  lines.push("");
  lines.push("Duration:");
  lines.push(`  ${formatDuration(report.durationMinutes)}`);
  lines.push("");
  lines.push("Observable usage:");
  lines.push(`  Input:        ${formatTokens(report.usage.input)}`);
  lines.push(`  Output:       ${formatTokens(report.usage.output)}`);
  lines.push(`  Tool results: ${formatTokens(report.usage.toolResults)}`);
  lines.push(`  Shell output: ${formatTokens(report.usage.shellOutput)}`);
  lines.push(`  Total:        ${formatTokens(report.usage.total)}`);
  lines.push("");
  lines.push("Session shape:");
  lines.push(`  Turns:        ${report.sessionShape.turns}`);
  lines.push(`  File edits:   ${report.sessionShape.fileEdits}`);
  lines.push(`  Shell calls:  ${report.sessionShape.shellCalls}`);
  lines.push(`  Tool calls:   ${report.sessionShape.toolCalls}`);
  lines.push("");
  lines.push(`Largest events (top ${LARGEST_EVENTS_LIMIT} by observable tokens):`);
  if (report.largestEvents.length === 0) {
    lines.push("  none");
  } else {
    for (const row of report.largestEvents) {
      lines.push(
        `  ${row.role} / ${row.sourceEvent}  ${formatTokens(row.estimatedTotalTokens)}`,
      );
    }
  }
  lines.push("");
  lines.push("Efficiency score:");
  lines.push(`  ${report.efficiencyScore} / 100`);
  lines.push("");
  lines.push("Red flags:");
  if (report.redFlags.length === 0) {
    lines.push("  none");
  } else {
    for (const flag of report.redFlags) {
      lines.push(`  ${flag.severity} ${flag.title}`);
      lines.push(`    ${flag.detail}`);
      lines.push("");
    }
  }
  lines.push("Recommendations:");
  report.recommendations.forEach((recommendation, index) => {
    lines.push(`  ${index + 1}. ${recommendation}`);
  });

  console.log(lines.join("\n"));
}
