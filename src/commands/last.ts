import {
  getDefaultDbPath,
  getEventsForLatestSession,
  openDb,
} from "../core/db.js";
import {
  analyzeSession,
  formatTokens,
  LARGEST_EVENTS_LIMIT,
  type LastReport,
} from "../core/sessionAnalytics.js";

export type { LastReport };

function formatDuration(mins: number): string {
  return mins < 1 ? "<1 minute" : `${mins} minute${mins === 1 ? "" : "s"}`;
}

export function getLastReport(): LastReport | null {
  const db = openDb(getDefaultDbPath());
  const events = getEventsForLatestSession(db);
  db.close();

  return analyzeSession(events, { contextAuditRoot: process.cwd() });
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
  lines.push(
    `Largest events (top ${LARGEST_EVENTS_LIMIT} by observable tokens):`,
  );
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
