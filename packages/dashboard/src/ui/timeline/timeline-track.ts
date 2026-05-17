import { escapeHtml } from "../shared/escapeHtml.js";
import type { TimelineRole } from "../shared/timelineRoles.js";

export type TimelineTrackSegmentInput = {
  role: TimelineRole;
  /** Segment width as % of track (0–100); clamped with a small minimum like the runtime. */
  widthPct: number;
  /** Optional segment tooltip (escaped). */
  title?: string;
};

/**
 * Inner HTML for `#timeline-track` using time-proportional widths (production shape).
 */
export function timelineTrackInnerHtml(
  segments: TimelineTrackSegmentInput[],
): string {
  return segments
    .map((s) => {
      const w = Math.min(100, Math.max(0.15, Number(s.widthPct) || 0));
      const titleAttr = s.title ? ` title="${escapeHtml(s.title)}"` : "";
      return `<div class="timeline-seg ${s.role}" style="width: ${w}%"${titleAttr}></div>`;
    })
    .join("");
}
