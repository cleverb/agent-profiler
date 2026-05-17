/**
 * Observable usage total + caption column.
 * Half-doughnut dial is opt-in (`showDialChart`); Chart.js attaches imperatively (`attachUsageDialChart`).
 * @see ADR-005
 */
import { escapeHtml } from "../shared/escapeHtml.js";

export type UsageTotalGaugeProps = {
  valueText: string;
  caption: string;
  /** e.g. `total-tokens` — live dashboard hook for scripted updates/tests */
  valueElementId?: string;
  /**
   * Embeds a positioned `<canvas>` for a Chart.js semi-doughnut dial behind centered copy.
   * After injecting HTML, call `attachUsageDialChart(canvas, segments)`.
   */
  showDialChart?: boolean;
  isAbbreviated?: boolean;
};

export function usageTotalGaugeInnerHtml(props: UsageTotalGaugeProps): string {
  const idAttr =
    props.valueElementId != null && props.valueElementId.trim() !== ""
      ? ` id="${escapeHtml(props.valueElementId.trim())}"`
      : "";

  const captionInner = `<span class="muted gauge-value-label">${escapeHtml(props.caption)}</span>`;
  const valueInner = `<span class="gauge-value"${idAttr}>${escapeHtml(props.valueText)}</span>`;

  if (props.showDialChart !== true) {
    return `
<div class="gauge">
  ${valueInner}
  ${captionInner}
</div>
`.trim();
  }

  return `
<div class="gauge gauge--with-dial" data-gauge-dial-root>
  <div class="gauge-dial-slot">
    <div class="gauge-center-copy">
      ${captionInner}
      ${valueInner}
    </div>
    <canvas data-gauge-dial="1" role="presentation" aria-hidden="true"></canvas>
  </div>
</div>
`.trim();
}
