/**
 * Parameterized HTML fragments for timeline / histogram demos (Storybook).
 */
import { escapeHtml } from "../shared/escapeHtml.js";

export type TimelineRole = "user" | "assistant" | "tool" | "shell" | "other";

export type TimelineSegment = {
  role: TimelineRole;
  /** flex-grow weight */
  flex: number;
};

export type TimelineCardProps = {
  heading?: string;
  metaLine?: string;
  segments?: TimelineSegment[];
  maxWidth?: string;
};

const defaultTimelineSegments: TimelineSegment[] = [
  { role: "user", flex: 2 },
  { role: "assistant", flex: 3 },
  { role: "tool", flex: 1 },
  { role: "assistant", flex: 4 },
  { role: "shell", flex: 1 },
  { role: "other", flex: 1 },
];

const defaultTimelineProps: Required<TimelineCardProps> = {
  heading: "Session timeline",
  metaLine: "1,000 events · 12.4 min",
  maxWidth: "720px",
  segments: defaultTimelineSegments,
};

export function timelineSampleSegmentsHtml(
  props: TimelineCardProps = {},
): string {
  const p = {
    ...defaultTimelineProps,
    ...props,
    segments: props.segments ?? defaultTimelineProps.segments,
  };

  const segs = p.segments
    .map((s) => {
      const flex = Math.max(0, Number(s.flex) || 0);
      return `<span class="timeline-seg ${s.role}" style="flex: ${flex}"></span>`;
    })
    .join("\n    ");

  return `
<section class="card span-3" style="max-width: ${escapeHtml(p.maxWidth)}">
  <h2>${escapeHtml(p.heading)}</h2>
  <p class="timeline-meta muted small">${escapeHtml(p.metaLine)}</p>
  <div class="timeline-track">
    ${segs}
  </div>
  <div class="timeline-legend">
    <span><i class="dot user"></i> user</span>
    <span><i class="dot assistant"></i> assistant</span>
    <span><i class="dot tool"></i> tool</span>
    <span><i class="dot shell"></i> shell</span>
    <span><i class="dot other"></i> other</span>
  </div>
</section>
`.trim();
}
