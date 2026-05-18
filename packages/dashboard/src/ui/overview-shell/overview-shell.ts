/**
 * Parameterized HTML for the dashboard overview shell (Storybook / live dashboard).
 * @see ADR-005
 */
import { dashboardButtonHtml } from "../dashboard-button/dashboard-button.js";
import {
  dashboardGridHtml,
  type DashboardGridTemplateAreaBreakpoints,
  type DashboardGridTemplateAreasRows,
} from "../dashboard-grid/dashboard-grid.js";
import {
  efficiencyViewHtml,
  type EfficiencyViewProps,
} from "../efficiency-view/efficiency-view.js";
import {
  observableUsageViewHtml,
  type ObservableUsageViewProps,
} from "../observable-usage-view/observable-usage-view.js";
import {
  contextAuditViewHtml,
  type ContextAuditViewProps,
} from "../context-audit-view/context-audit-view.js";
import {
  recommendationsViewHtml,
  type RecommendationsViewProps,
} from "../recommendations-view/recommendations-view.js";
import {
  redFlagsViewHtml,
  type RedFlagsViewProps,
} from "../red-flags-view/red-flags-view.js";
import { escapeHtml } from "../shared/escapeHtml.js";
import {
  toolHistogramViewHtml,
  type ToolHistogramViewProps,
} from "../tool-histogram-view/tool-histogram-view.js";
import {
  timelineViewHtml,
  type TimelineViewProps,
} from "../timeline-view/timeline-view.js";
import type { UsageDialChartSegmentInput } from "../usage-total-gauge/usage-total-gauge-dial-chart.js";
import {
  usageBreakdownBarsInnerHtml,
  usageRowsToBreakdownInnerHtml,
  type UsageBreakdownBarRow,
} from "../usage-breakdown/usage-breakdown-bars.js";
import type { UsageBarRow } from "../usage-bars/usage-bars.js";

export type { UsageBarRow, UsageBarVariant } from "../usage-bars/usage-bars.js";

export type OverviewShellOptions = {
  observableUsageView?: Partial<ObservableUsageViewProps>;
  efficiencyView?: Partial<EfficiencyViewProps>;
  timelineView?: Partial<TimelineViewProps>;
  toolHistogramView?: Partial<ToolHistogramViewProps>;
  contextAuditView?: Partial<ContextAuditViewProps>;
  redFlagsView?: Partial<RedFlagsViewProps>;
  recommendationsView?: Partial<RecommendationsViewProps>;
  dashboardGrid?: {
    templateAreas?:
      | DashboardGridTemplateAreasRows
      | DashboardGridTemplateAreaBreakpoints;
    className?: string;
  };
};

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
  /** Trusted HTML appended inside dashboard grid after the overview row (or slots). */
  additionalMainInnerHtml?: string;
  /** `id` on the session `<select>` (live dashboard wiring). */
  sessionSelectId?: string;
  /** `id` on the subtitle `<p class="muted">` under the title (meta line). */
  subtitleElementId?: string;
  /** Passed through to {@link dashboardButtonHtml}. */
  refreshButtonId?: string;
  refreshButtonAriaLabel?: string;
  /**
   * View-level options object for one instance of each dashboard view.
   * Supports incremental expansion as more views are extracted.
   */
  options?: OverviewShellOptions;
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
    | "options"
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

    const observableSection = observableUsageViewHtml({
      id: p.options?.observableUsageView?.id,
      className: p.options?.observableUsageView?.className,
      title: p.options?.observableUsageView?.title ?? "Observable usage",
      span: p.options?.observableUsageView?.span ?? "2",
      valueText:
        p.options?.observableUsageView?.valueText ?? p.totalTokensValue,
      caption: p.options?.observableUsageView?.caption ?? p.totalTokensCaption,
      barsHtml: p.options?.observableUsageView?.barsHtml ?? usageBarsHtml,
      showDialChart:
        p.options?.observableUsageView?.showDialChart ?? p.showDialChart,
      valueElementId: p.options?.observableUsageView?.valueElementId,
      isAbbreviated: p.options?.observableUsageView?.isAbbreviated ?? true,
      barsElementId: p.options?.observableUsageView?.barsElementId,
    });

    const efficiencySection = efficiencyViewHtml({
      id: p.options?.efficiencyView?.id,
      className: p.options?.efficiencyView?.className,
      title: p.options?.efficiencyView?.title ?? "Efficiency",
      scoreText: p.options?.efficiencyView?.scoreText ?? p.efficiencyScore,
      sparklinePoints:
        p.options?.efficiencyView?.sparklinePoints ?? p.sparklinePoints,
      svgId: p.options?.efficiencyView?.svgId ?? "score-sparkline",
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

  const lowerViewBlocks: string[] = [];
  if (p.options?.timelineView != null) {
    lowerViewBlocks.push(
      timelineViewHtml({
        id: p.options.timelineView.id,
        className: p.options.timelineView.className,
        title: p.options.timelineView.title ?? "Session timeline",
        span: p.options.timelineView.span ?? "3",
        metaLine: p.options.timelineView.metaLine ?? "",
        metaElementId: p.options.timelineView.metaElementId,
        trackHtml: p.options.timelineView.trackHtml,
        trackElementId: p.options.timelineView.trackElementId,
      }),
    );
  }
  if (p.options?.toolHistogramView != null) {
    lowerViewBlocks.push(
      toolHistogramViewHtml({
        id: p.options.toolHistogramView.id,
        className: p.options.toolHistogramView.className,
        title: p.options.toolHistogramView.title ?? "Tool result sizes",
        span: p.options.toolHistogramView.span,
        barsElementId: p.options.toolHistogramView.barsElementId,
        barsHtml: p.options.toolHistogramView.barsHtml,
        parityLineElementId: p.options.toolHistogramView.parityLineElementId,
        parityLineText: p.options.toolHistogramView.parityLineText,
        operationLineElementId:
          p.options.toolHistogramView.operationLineElementId,
        operationLineText: p.options.toolHistogramView.operationLineText,
      }),
    );
  }
  if (p.options?.contextAuditView != null) {
    lowerViewBlocks.push(
      contextAuditViewHtml({
        id: p.options.contextAuditView.id,
        className: p.options.contextAuditView.className,
        title: p.options.contextAuditView.title ?? "Context audit",
        span: p.options.contextAuditView.span ?? "2",
        description:
          p.options.contextAuditView.description ??
          "Estimated tokens for always-on repo files",
        barsElementId: p.options.contextAuditView.barsElementId,
        barsHtml: p.options.contextAuditView.barsHtml,
      }),
    );
  }
  if (p.options?.redFlagsView != null) {
    lowerViewBlocks.push(
      redFlagsViewHtml({
        id: p.options.redFlagsView.id,
        className: p.options.redFlagsView.className,
        title: p.options.redFlagsView.title ?? "Red flags",
        span: p.options.redFlagsView.span,
        listElementId: p.options.redFlagsView.listElementId,
        listHtml: p.options.redFlagsView.listHtml,
      }),
    );
  }
  if (p.options?.recommendationsView != null) {
    lowerViewBlocks.push(
      recommendationsViewHtml({
        id: p.options.recommendationsView.id,
        className: p.options.recommendationsView.className,
        title: p.options.recommendationsView.title ?? "Recommendations",
        span: p.options.recommendationsView.span ?? "2",
        listElementId: p.options.recommendationsView.listElementId,
        listHtml: p.options.recommendationsView.listHtml,
      }),
    );
  }
  const lowerViewsSuffix =
    lowerViewBlocks.length > 0 ? `\n\n${lowerViewBlocks.join("\n\n")}` : "";

  const gridContentHtml = `${overviewBlocks}${suffix}${lowerViewsSuffix}`;
  const dashboardGrid = dashboardGridHtml({
    contentHtml: gridContentHtml,
    templateAreas: p.options?.dashboardGrid?.templateAreas,
    className: p.options?.dashboardGrid?.className,
  });

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

  ${dashboardGrid}
</div>
`.trim();
}
