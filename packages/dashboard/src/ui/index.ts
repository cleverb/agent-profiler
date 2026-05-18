export { escapeHtml } from "./shared/escapeHtml.js";
export {
  formatTokenCountAbbreviated,
  formatTokenCountFull,
} from "./shared/formatTokenCount.js";
export {
  dashboardButtonHtml,
  type DashboardButtonProps,
} from "./dashboard-button/dashboard-button.js";
export {
  dashboardCardHtml,
  type DashboardCardProps,
  type DashboardCardSpan,
} from "./dashboard-card/dashboard-card.js";
export {
  usageTotalGaugeInnerHtml,
  type UsageTotalGaugeProps,
} from "./usage-total-gauge/usage-total-gauge.js";
export {
  attachUsageDialChart,
  defaultUsageDialSegmentsFromUsage,
  detachUsageDialChart,
  detachUsageDialChartsIn,
  type UsageDialChartSegmentInput,
} from "./usage-total-gauge/usage-total-gauge-dial-chart.js";
export {
  efficiencyViewHtml,
  type EfficiencyViewProps,
} from "./efficiency-view/efficiency-view.js";
export {
  attachResponsiveDashboardGrids,
  dashboardGridHtml,
  type DashboardGridProps,
  type DashboardGridTemplateAreaBreakpoints,
  type DashboardGridTemplateAreasRows,
} from "./dashboard-grid/dashboard-grid.js";
export {
  observableUsageViewHtml,
  type ObservableUsageViewProps,
} from "./observable-usage-view/observable-usage-view.js";
export {
  usageBreakdownBarsInnerHtml,
  usageRowsToBreakdownInnerHtml,
  type UsageBreakdownBarRow,
  type UsageBreakdownBarsInnerProps,
} from "./usage-breakdown/usage-breakdown-bars.js";
export {
  overviewShellHtml,
  type OverviewShellProps,
  type UsageBarRow,
  type UsageBarVariant,
} from "./overview-shell/overview-shell.js";
export {
  timelineSampleSegmentsHtml,
  timelineTrackInnerHtml,
  computeTimelineTrackSegments,
  type TimelineCardProps,
  type TimelineRole,
  type TimelineSegment,
  type TimelineApiEvent,
  type TimelineTrackSegmentInput,
} from "./timeline/timeline.js";
export {
  timelineViewHtml,
  type TimelineViewProps,
} from "./timeline-view/timeline-view.js";
export {
  toolResultVerticalBarsHtml,
  verticalBarsInnerHtml,
  type ToolHistogramProps,
  type VerticalBarItem,
} from "./histogram/histogram.js";
export {
  toolHistogramViewHtml,
  type ToolHistogramViewProps,
} from "./tool-histogram-view/tool-histogram-view.js";
export {
  contextAuditViewHtml,
  type ContextAuditViewProps,
} from "./context-audit-view/context-audit-view.js";
export {
  redFlagsViewHtml,
  type RedFlagsViewProps,
} from "./red-flags-view/red-flags-view.js";
export {
  recommendationsViewHtml,
  type RecommendationsViewProps,
} from "./recommendations-view/recommendations-view.js";
export { usageBarsInnerHtml } from "./usage-bars/usage-bars.js";
export {
  sparklinePolylinePoints,
  type SparklinePoint,
} from "./shared/sparkline.js";
export { eventRoleToTimelineClass } from "./shared/eventRole.js";
