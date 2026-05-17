/**
 * Efficiency score + sparkline inner fragment.
 * @see ADR-005
 */
import { escapeHtml } from "../shared/escapeHtml.js";

export type EfficiencyInnerProps = {
  scoreText: string;
  /** SVG polyline `points` attribute */
  sparklinePoints: string;
  /** Matches shipped dashboard `#score-sparkline` when set */
  svgId?: string;
};

export function efficiencyInnerHtml(props: EfficiencyInnerProps): string {
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
    <polyline points="${escapeHtml(props.sparklinePoints)}" />
  </svg>
</div>
`.trim();
}
