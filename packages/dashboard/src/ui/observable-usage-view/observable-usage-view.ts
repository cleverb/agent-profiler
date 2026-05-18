/**
 * Observable usage card view (total gauge + breakdown bars).
 * @see ADR-005
 */
import {
  dashboardCardHtml,
  type DashboardCardSpan,
} from "../dashboard-card/dashboard-card.js";
import { escapeHtml } from "../shared/escapeHtml.js";
import { usageTotalGaugeInnerHtml } from "../usage-total-gauge/usage-total-gauge.js";

export type ObservableUsageViewProps = {
  /** Optional DOM id on the card section. */
  id?: string;
  /** Optional extra card classes (for grid-area hooks like `card-b`). */
  className?: string;
  /** Optional card heading. */
  title?: string;
  /** Optional card span class (`span-2`, `span-3`). */
  span?: DashboardCardSpan;
  valueText: string;
  caption: string;
  barsHtml: string;
  showDialChart?: boolean;
  valueElementId?: string;
  isAbbreviated?: boolean;
  barsElementId?: string;
};

export function observableUsageViewHtml(
  props: ObservableUsageViewProps,
): string {
  const barsIdAttr =
    props.barsElementId != null && props.barsElementId !== ""
      ? ` id="${escapeHtml(props.barsElementId)}"`
      : "";
  const bodyHtml = `
<div class="gauge-row">
  ${usageTotalGaugeInnerHtml({
    valueText: props.valueText,
    caption: props.caption,
    valueElementId: props.valueElementId,
    showDialChart: props.showDialChart ?? false,
    isAbbreviated: props.isAbbreviated ?? true,
  })}
  <div class="bars"${barsIdAttr}>
    ${props.barsHtml}
  </div>
</div>`.trim();

  return dashboardCardHtml({
    id: props.id,
    className: props.className,
    title: props.title ?? "Observable usage",
    span: props.span ?? "2",
    bodyHtml,
  });
}
