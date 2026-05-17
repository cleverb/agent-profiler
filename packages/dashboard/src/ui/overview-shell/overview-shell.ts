/**
 * Parameterized HTML for the dashboard overview shell (Storybook / previews).
 */
import { escapeHtml } from "../shared/escapeHtml.js";
import {
  usageBarsInnerHtml,
  type UsageBarRow,
} from "../usage-bars/usage-bars.js";

export type { UsageBarRow, UsageBarVariant } from "../usage-bars/usage-bars.js";

export type OverviewShellProps = {
  title?: string;
  subtitle?: string;
  sessionOptions?: string[];
  refreshLabel?: string;
  totalTokensValue?: string;
  totalTokensCaption?: string;
  usageRows?: UsageBarRow[];
  efficiencyScore?: string;
  /** SVG polyline `points` attribute */
  sparklinePoints?: string;
};

const defaultUsageRows: UsageBarRow[] = [
  { label: "Input", widthPct: 72, valueText: "41,200", variant: "input" },
  { label: "Output", widthPct: 55, valueText: "31,800", variant: "output" },
  { label: "Tool / MCP", widthPct: 38, valueText: "22,100", variant: "tool" },
  { label: "Shell", widthPct: 12, valueText: "6,900", variant: "shell" },
];

const defaultProps: Required<Omit<OverviewShellProps, "usageRows">> & {
  usageRows: UsageBarRow[];
} = {
  title: "Agent Profiler Dashboard",
  subtitle: "Storybook preview · session mock",
  sessionOptions: ["latest-session", "older-run"],
  refreshLabel: "Refresh",
  totalTokensValue: "128,400",
  totalTokensCaption: "estimated total tokens",
  usageRows: defaultUsageRows,
  efficiencyScore: "76",
  sparklinePoints: "0,40 40,28 80,34 120,12 160,22 200,8",
};

export function overviewShellHtml(props: OverviewShellProps = {}): string {
  const p = {
    ...defaultProps,
    ...props,
    usageRows: props.usageRows ?? defaultProps.usageRows,
    sessionOptions: props.sessionOptions ?? defaultProps.sessionOptions,
  };

  const sessionOptionsHtml = p.sessionOptions
    .map((opt) => `<option>${escapeHtml(opt)}</option>`)
    .join("\n          ");

  const usageRowsHtml = usageBarsInnerHtml(p.usageRows);

  return `
<div class="layout">
  <header class="header">
    <div>
      <h1>${escapeHtml(p.title)}</h1>
      <p class="muted">${escapeHtml(p.subtitle)}</p>
    </div>
    <div class="header-actions">
      <label class="session-label">
        Session
        <select aria-label="Session">
          ${sessionOptionsHtml}
        </select>
      </label>
      <button type="button">${escapeHtml(p.refreshLabel)}</button>
    </div>
  </header>

  <main class="grid">
    <section class="card span-2">
      <h2>Observable usage</h2>
      <div class="gauge-row">
        <div class="gauge">
          <span class="gauge-value">${escapeHtml(p.totalTokensValue)}</span>
          <span class="muted small">${escapeHtml(p.totalTokensCaption)}</span>
        </div>
        <div class="bars">
          ${usageRowsHtml}
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Efficiency</h2>
      <div class="score-block">
        <span class="score">${escapeHtml(p.efficiencyScore)}</span>
        <span class="muted small">/ 100</span>
      </div>
      <div class="sparkline-wrap">
        <svg
          id="score-sparkline"
          viewBox="0 0 200 48"
          aria-hidden="true"
        >
          <polyline points="${escapeHtml(p.sparklinePoints)}" />
        </svg>
      </div>
    </section>
  </main>
</div>
`.trim();
}
