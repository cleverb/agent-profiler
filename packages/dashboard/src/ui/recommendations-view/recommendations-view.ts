/**
 * Recommendations card view (ordered list slot).
 * @see ADR-005
 */
import {
  dashboardCardHtml,
  type DashboardCardSpan,
} from "../dashboard-card/dashboard-card.js";
import { escapeHtml } from "../shared/escapeHtml.js";

export type RecommendationsViewProps = {
  id?: string;
  className?: string;
  title?: string;
  span?: DashboardCardSpan;
  listElementId?: string;
  listHtml?: string;
};

export function recommendationsViewHtml(
  props: RecommendationsViewProps = {},
): string {
  const listIdAttr =
    props.listElementId != null && props.listElementId !== ""
      ? ` id="${escapeHtml(props.listElementId)}"`
      : "";
  const bodyHtml = `<ol class="rec-list"${listIdAttr}>${props.listHtml ?? ""}</ol>`;

  return dashboardCardHtml({
    id: props.id,
    className: props.className,
    title: props.title ?? "Recommendations",
    span: props.span ?? "2",
    bodyHtml,
  });
}
