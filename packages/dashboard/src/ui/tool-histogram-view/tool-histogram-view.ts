/**
 * Tool result histogram view (vertical bars + parity/operation lines).
 * @see ADR-005
 */
import {
  dashboardCardHtml,
  type DashboardCardSpan,
} from "../dashboard-card/dashboard-card.js";
import { escapeHtml } from "../shared/escapeHtml.js";

export type ToolHistogramViewProps = {
  id?: string;
  className?: string;
  title?: string;
  span?: DashboardCardSpan;
  barsElementId?: string;
  barsHtml?: string;
  parityLineElementId?: string;
  parityLineText?: string;
  operationLineElementId?: string;
  operationLineText?: string;
};

export function toolHistogramViewHtml(
  props: ToolHistogramViewProps = {},
): string {
  const barsIdAttr =
    props.barsElementId != null && props.barsElementId !== ""
      ? ` id="${escapeHtml(props.barsElementId)}"`
      : "";
  const parityIdAttr =
    props.parityLineElementId != null && props.parityLineElementId !== ""
      ? ` id="${escapeHtml(props.parityLineElementId)}"`
      : "";
  const operationIdAttr =
    props.operationLineElementId != null && props.operationLineElementId !== ""
      ? ` id="${escapeHtml(props.operationLineElementId)}"`
      : "";

  const bodyHtml = `
<div class="bars vertical"${barsIdAttr}>${props.barsHtml ?? ""}</div>
<p class="muted small"${parityIdAttr}>${escapeHtml(props.parityLineText ?? "")}</p>
<p class="muted small"${operationIdAttr}>${escapeHtml(props.operationLineText ?? "")}</p>
`.trim();

  return dashboardCardHtml({
    id: props.id,
    className: props.className,
    title: props.title ?? "Tool result sizes",
    span: props.span,
    bodyHtml,
  });
}
