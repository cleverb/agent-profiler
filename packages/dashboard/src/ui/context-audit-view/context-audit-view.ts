/**
 * Context audit card view (description + vertical bars slot).
 * @see ADR-005
 */
import {
  dashboardCardHtml,
  type DashboardCardSpan,
} from "../dashboard-card/dashboard-card.js";
import { escapeHtml } from "../shared/escapeHtml.js";

export type ContextAuditViewProps = {
  id?: string;
  className?: string;
  title?: string;
  span?: DashboardCardSpan;
  description?: string;
  barsElementId?: string;
  barsHtml?: string;
};

export function contextAuditViewHtml(
  props: ContextAuditViewProps = {},
): string {
  const barsIdAttr =
    props.barsElementId != null && props.barsElementId !== ""
      ? ` id="${escapeHtml(props.barsElementId)}"`
      : "";
  const bodyHtml = `
<p class="muted small">${escapeHtml(
    props.description ?? "Estimated tokens for always-on repo files",
  )}</p>
<div class="bars vertical tall"${barsIdAttr}>${props.barsHtml ?? ""}</div>
`.trim();

  return dashboardCardHtml({
    id: props.id,
    className: props.className,
    title: props.title ?? "Context audit",
    span: props.span ?? "2",
    bodyHtml,
  });
}
