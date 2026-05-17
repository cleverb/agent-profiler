/**
 * Parameterized HTML for the dashboard overview shell (Storybook / live dashboard).
 * @see ADR-005
 */
import { dashboardButtonHtml } from "../dashboard-button/dashboard-button.js";
import { dashboardCardHtml } from "../dashboard-card/dashboard-card.js";
import { efficiencyInnerHtml } from "../efficiency-inner/efficiency-inner.js";
import { escapeHtml } from "../shared/escapeHtml.js";
import { usageTotalGaugeInnerHtml } from "../usage-total-gauge/usage-total-gauge.js";
import type { UsageDialChartSegmentInput } from "../usage-total-gauge/usage-total-gauge-dial-chart.js";
import {
  usageBreakdownBarsInnerHtml,
  usageRowsToBreakdownInnerHtml,
  type UsageBreakdownBarRow,
} from "../usage-breakdown/usage-breakdown-bars.js";
import type { UsageBarRow } from "../usage-bars/usage-bars.js";

export type { UsageBarRow, UsageBarVariant } from "../usage-bars/usage-bars.js";

export type OverviewShellProps = {
  title?: string;
  subtitle?: string;
  sessionOptions?: string[];
  refreshLabel?: string;
  totalTokensValue?: string;
  totalTokensCaption?: string;
  usageRows?: UsageBarRow[];
  /**
   * When set, drives horizontal breakdown from numeric tokens (Storybook-friendly).
   * When omitted, `usageRows` string values are used instead.
   */
  usageBreakdownRows?: UsageBreakdownBarRow[];
  /** Abbreviates category token counts (ceil-k ≥10k; one decimal 1k–9.999k). */
  usageAbbreviated?: boolean;
  efficiencyScore?: string;
  /** SVG polyline `points` attribute */
  sparklinePoints?: string;
  /**
   * Renders gauge canvas for Chart.js; mount with Storybook render or dashboard `attachUsageDialChart`.
   */
  showDialChart?: boolean;
  /** Dial arc weights/colors (`defaultUsageDialSegmentsFromUsage`) */
  usageDialSegments?: UsageDialChartSegmentInput[];
  /**
   * When true, emit empty `#slot-overview-usage` / `#slot-overview-efficiency`
   * wrappers (`display: contents`) so the bundled dashboard can hydrate cards from API data.
   */
  useLiveOverviewSlots?: boolean;
  /** Trusted HTML appended inside `<main class="grid">` after the overview row (or slots). */
  additionalMainInnerHtml?: string;
  /** `id` on the session `<select>` (live dashboard wiring). */
  sessionSelectId?: string;
  /** `id` on the subtitle `<p class="muted">` under the title (meta line). */
  subtitleElementId?: string;
  /** Passed through to {@link dashboardButtonHtml}. */
  refreshButtonId?: string;
  refreshButtonAriaLabel?: string;
};

const defaultUsageRows: UsageBarRow[] = [
  { label: "Input", widthPct: 72, valueText: "41,200", variant: "input" },
  { label: "Output", widthPct: 55, valueText: "31,800", variant: "output" },
  { label: "Tool / MCP", widthPct: 38, valueText: "22,100", variant: "tool" },
  { label: "Shell", widthPct: 12, valueText: "6,900", variant: "shell" },
];

const defaultProps: Required<
  Omit<
    OverviewShellProps,
    | "usageRows"
    | "usageBreakdownRows"
    | "usageAbbreviated"
    | "usageDialSegments"
    | "useLiveOverviewSlots"
    | "additionalMainInnerHtml"
    | "sessionSelectId"
    | "subtitleElementId"
    | "refreshButtonId"
    | "refreshButtonAriaLabel"
  >
> & {
  usageRows: UsageBarRow[];
  usageBreakdownRows?: UsageBreakdownBarRow[];
  usageAbbreviated: boolean;
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
  usageAbbreviated: false,
  showDialChart: false,
};

export function overviewShellHtml(props: OverviewShellProps = {}): string {
  const p = {
    ...defaultProps,
    ...props,
    usageRows: props.usageRows ?? defaultProps.usageRows,
    sessionOptions: props.sessionOptions ?? defaultProps.sessionOptions,
    usageAbbreviated: props.usageAbbreviated ?? defaultProps.usageAbbreviated,
    showDialChart: props.showDialChart ?? defaultProps.showDialChart,
    useLiveOverviewSlots: props.useLiveOverviewSlots ?? false,
    additionalMainInnerHtml: props.additionalMainInnerHtml ?? "",
  };

  const sessionOptionsHtml = p.sessionOptions
    .map((opt) => `<option>${escapeHtml(opt)}</option>`)
    .join("\n          ");

  let overviewBlocks: string;
  if (p.useLiveOverviewSlots) {
    overviewBlocks = `
<div id="slot-overview-usage" class="slot-dashboard-grid"></div>
<div id="slot-overview-efficiency" class="slot-dashboard-grid"></div>`.trim();
  } else {
    const usageBarsHtml =
      props.usageBreakdownRows !== undefined
        ? usageBreakdownBarsInnerHtml({
            rows: props.usageBreakdownRows,
            isAbbreviated: p.usageAbbreviated,
          })
        : usageRowsToBreakdownInnerHtml(p.usageRows, {
            isAbbreviated: p.usageAbbreviated,
          });

    const observableBody = `
<div class="gauge-row">
  ${usageTotalGaugeInnerHtml({
    valueText: p.totalTokensValue,
    caption: p.totalTokensCaption,
    showDialChart: p.showDialChart,
    isAbbreviated: true,
  })}
  <div class="bars">
    ${usageBarsHtml}
  </div>
</div>`.trim();

    const observableSection = dashboardCardHtml({
      title: "Observable usage",
      span: "2",
      bodyHtml: observableBody,
    });

    const efficiencyBody = efficiencyInnerHtml({
      scoreText: p.efficiencyScore,
      sparklinePoints: p.sparklinePoints,
      svgId: "score-sparkline",
    });

    const efficiencySection = dashboardCardHtml({
      title: "Efficiency",
      bodyHtml: efficiencyBody,
    });

    overviewBlocks = `${observableSection}\n\n${efficiencySection}`;
  }

  const subtitleIdAttr =
    props.subtitleElementId != null && props.subtitleElementId !== ""
      ? ` id="${escapeHtml(props.subtitleElementId)}"`
      : "";

  const sessionSelectIdAttr =
    props.sessionSelectId != null && props.sessionSelectId !== ""
      ? ` id="${escapeHtml(props.sessionSelectId)}"`
      : "";

  const suffix =
    p.additionalMainInnerHtml.trim() === ""
      ? ""
      : `\n\n${p.additionalMainInnerHtml.trim()}`;

  return `
<div class="layout">
  <header class="header">
    <div>
      <h1>${escapeHtml(p.title)}</h1>
      <p class="muted"${subtitleIdAttr}>${escapeHtml(p.subtitle)}</p>
    </div>
    <div class="header-actions">
      <label class="session-label">
        Session
        <select aria-label="Session"${sessionSelectIdAttr}>
          ${sessionOptionsHtml}
        </select>
      </label>
      ${dashboardButtonHtml({
        label: p.refreshLabel,
        id: props.refreshButtonId,
        ariaLabel: props.refreshButtonAriaLabel,
      })}
    </div>
  </header>

  <main class="grid">
    ${overviewBlocks}${suffix}
  </main>
</div>
`.trim();
}
