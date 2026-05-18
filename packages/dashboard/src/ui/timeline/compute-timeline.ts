import { eventRoleToTimelineClass } from "../shared/eventRole.js";
import type { TimelineTrackSegmentInput } from "./timeline-track.js";

export type TimelineApiEvent = {
  createdAt: string;
  role: string;
  estimatedTotalTokens?: number;
};

/**
 * Turn API timeline events into width-% segments for `timelineTrackInnerHtml`,
 * matching the legacy dashboard algorithm.
 */
export function computeTimelineTrackSegments(
  timeline: TimelineApiEvent[],
  fmtTokens: (n: number | null | undefined) => string,
): TimelineTrackSegmentInput[] {
  if (!timeline || timeline.length === 0) return [];
  const t0 = new Date(timeline[0].createdAt).getTime();
  const t1 = new Date(timeline[timeline.length - 1].createdAt).getTime();
  const span = Math.max(1, t1 - t0);
  const out: TimelineTrackSegmentInput[] = [];
  for (let i = 0; i < timeline.length; i++) {
    const ev = timeline[i];
    const start = new Date(ev.createdAt).getTime();
    const end =
      i + 1 < timeline.length
        ? new Date(timeline[i + 1].createdAt).getTime()
        : start + 1;
    const widthPct = Math.max(0.15, ((end - start) / span) * 100);
    const role = eventRoleToTimelineClass(ev.role);
    const title = `${ev.role} · ${fmtTokens(ev.estimatedTotalTokens)} tok`;
    out.push({ role, widthPct, title });
  }
  return out;
}
