/**
 * Observable usage total + caption column.
 * @see ADR-005
 */
import { escapeHtml } from "../shared/escapeHtml.js";

export type UsageTotalGaugeProps = {
  valueText: string;
  caption: string;
};

export function usageTotalGaugeInnerHtml(props: UsageTotalGaugeProps): string {
  return `
<div class="gauge">
  <span class="gauge-value">${escapeHtml(props.valueText)}</span>
  <span class="muted small">${escapeHtml(props.caption)}</span>
</div>
`.trim();
}
