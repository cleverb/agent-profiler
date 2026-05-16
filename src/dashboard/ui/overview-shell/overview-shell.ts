/**
 * Parameterized HTML for the dashboard overview shell (Storybook / previews).
 * Not used by the runtime dashboard bundle in `public/app.js`.
 */
import { escapeHtml } from "../shared/escapeHtml.js";

export type UsageBarVariant = "input" | "output" | "tool" | "shell";

export type UsageBarRow = {
  label: string;
  /** 0–100, width of the filled bar */
  widthPct: number;
  /** Shown at end of row (e.g. token count) */
  valueText: string;
  /** Bar color; when omitted, inferred from `label` */
  variant?: UsageBarVariant;
};

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

function usageBarVariant(row: UsageBarRow): UsageBarVariant {
  if (row.variant) return row.variant;
  if (row.label === "Output") return "output";
  if (row.label.includes("Tool")) return "tool";
  if (row.label === "Shell") return "shell";
  return "input";
}

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

  const usageRowsHtml = p.usageRows
    .map((row) => {
      const w = Math.min(100, Math.max(0, Number(row.widthPct) || 0));
      const cls = usageBarVariant(row);
      return `
          <div class="bar-row">
            <span>${escapeHtml(row.label)}</span>
            <div class="bar-track"><div class="bar-fill ${cls}" style="width:${w}%"></div></div>
            <span class="muted small">${escapeHtml(row.valueText)}</span>
          </div>`;
    })
    .join("");

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
