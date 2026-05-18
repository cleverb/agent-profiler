/**
 * Efficiency score + sparkline card view.
 * @see ADR-005
 */
import { dashboardCardHtml } from "../dashboard-card/dashboard-card.js";
import { escapeHtml } from "../shared/escapeHtml.js";

export type EfficiencyViewProps = {
  /** Optional DOM id on the card section. */
  id?: string;
  /** Optional extra card classes (for grid-area hooks like `card-a`). */
  className?: string;
  /** Optional card heading. */
  title?: string;
  scoreText: string;
  /** SVG polyline `points` attribute */
  sparklinePoints: string;
  /** Optional DOM id for the SVG (dashboard uses `score-sparkline`; styles use `.sparkline-wrap`). */
  svgId?: string;
};

function efficiencyViewInnerHtml(
  props: Pick<EfficiencyViewProps, "scoreText" | "sparklinePoints" | "svgId">,
): string {
  const idAttr =
    props.svgId != null && props.svgId !== ""
      ? ` id="${escapeHtml(props.svgId)}"`
      : "";
  return `
<div class="score-block">
  <span class="score">${escapeHtml(props.scoreText)}</span>
  <span class="muted small">/ 100</span>
</div>
<div class="sparkline-wrap">
  <svg${idAttr}
    viewBox="0 0 200 48"
    aria-hidden="true"
  >
    <polyline fill="none" points="${escapeHtml(props.sparklinePoints)}" />
  </svg>
</div>
`.trim();
}

export function efficiencyViewHtml(props: EfficiencyViewProps): string {
  return dashboardCardHtml({
    id: props.id,
    className: props.className,
    title: props.title ?? "Efficiency",
    bodyHtml: efficiencyViewInnerHtml(props),
  });
}
