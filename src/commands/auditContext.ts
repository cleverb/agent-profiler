import { runContextAudit } from "../core/contextAudit.js";

function formatTokens(value: number): string {
  return `~${new Intl.NumberFormat("en-US").format(value)}`;
}

export type AuditContextReport = {
  totalEstimatedTokens: number;
  files: Array<{ path: string; estimatedTokens: number }>;
  recommendations: string[];
};

export function getAuditContextReport(): AuditContextReport {
  const result = runContextAudit(process.cwd());
  const recommendations =
    result.totalEstimatedTokens > 6000
      ? [
          "Move large reference docs from always-on rules into on-demand skills.",
          "Keep always-on rules short, direct, and behavioral.",
          "Trim long examples from core instruction files.",
        ]
      : [
          "Context footprint is currently in a healthy range.",
          "Re-run this audit after major rule or skill updates.",
        ];

  return {
    totalEstimatedTokens: result.totalEstimatedTokens,
    files: result.files,
    recommendations,
  };
}

export function runAuditContext(): void {
  const report = getAuditContextReport();

  const lines: string[] = [];
  lines.push("Agent Profiler: Context Audit");
  lines.push("");
  lines.push("Estimated always-on / agent-adjacent context:");
  lines.push(`  ${formatTokens(report.totalEstimatedTokens)} tokens`);
  lines.push("");
  lines.push("Largest contributors:");

  if (report.files.length === 0) {
    lines.push("  none found");
  } else {
    for (const file of report.files.slice(0, 8)) {
      lines.push(
        `  ${file.path.padEnd(40, " ")} ${formatTokens(file.estimatedTokens)}`,
      );
    }
  }

  lines.push("");
  lines.push("Recommendations:");
  report.recommendations.forEach((recommendation, index) => {
    lines.push(`  ${index + 1}. ${recommendation}`);
  });

  console.log(lines.join("\n"));
}
