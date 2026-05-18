/**
 * Red flags card view (unordered list slot).
 * @see ADR-005
 */
import {
  dashboardCardHtml,
  type DashboardCardSpan,
} from "../dashboard-card/dashboard-card.js";
import { escapeHtml } from "../shared/escapeHtml.js";

export type RedFlagsViewProps = {
  id?: string;
  className?: string;
  title?: string;
  span?: DashboardCardSpan;
  listElementId?: string;
  listHtml?: string;
};

export function redFlagsViewHtml(props: RedFlagsViewProps = {}): string {
  const listIdAttr =
    props.listElementId != null && props.listElementId !== ""
      ? ` id="${escapeHtml(props.listElementId)}"`
      : "";
  const bodyHtml = `<ul class="flag-list"${listIdAttr}>${props.listHtml ?? ""}</ul>`;

  return dashboardCardHtml({
    id: props.id,
    className: props.className,
    title: props.title ?? "Red flags",
    span: props.span,
    bodyHtml,
  });
}
