/**
 * Timeline card view with meta, track slot, and role legend.
 * @see ADR-005
 */
import {
  dashboardCardHtml,
  type DashboardCardSpan,
} from "../dashboard-card/dashboard-card.js";
import { escapeHtml } from "../shared/escapeHtml.js";

export type TimelineViewProps = {
  id?: string;
  className?: string;
  title?: string;
  span?: DashboardCardSpan;
  metaLine?: string;
  metaElementId?: string;
  trackHtml?: string;
  trackElementId?: string;
};

export function timelineViewHtml(props: TimelineViewProps = {}): string {
  const metaIdAttr =
    props.metaElementId != null && props.metaElementId !== ""
      ? ` id="${escapeHtml(props.metaElementId)}"`
      : "";
  const trackIdAttr =
    props.trackElementId != null && props.trackElementId !== ""
      ? ` id="${escapeHtml(props.trackElementId)}"`
      : "";
  const bodyHtml = `
<div class="timeline-meta muted small"${metaIdAttr}>${escapeHtml(
    props.metaLine ?? "",
  )}</div>
<div class="timeline-track"${trackIdAttr}>${props.trackHtml ?? ""}</div>
<div class="timeline-legend">
  <span><i class="dot user"></i> user</span>
  <span><i class="dot assistant"></i> assistant</span>
  <span><i class="dot tool"></i> tool</span>
  <span><i class="dot shell"></i> shell</span>
  <span><i class="dot other"></i> other</span>
</div>
`.trim();

  return dashboardCardHtml({
    id: props.id,
    className: props.className,
    title: props.title ?? "Session timeline",
    span: props.span ?? "3",
    bodyHtml,
  });
}
