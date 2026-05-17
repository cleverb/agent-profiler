/**
 * Section chrome for dashboard panels.
 * @see ADR-005
 */
import { escapeHtml } from "../shared/escapeHtml.js";

export type DashboardCardSpan = "2" | "3";

export type DashboardCardProps = {
  /** Inner HTML only from escaped/trusted fragments at call sites. */
  bodyHtml: string;
  title?: string;
  span?: DashboardCardSpan;
  /** Concatenated after `.card` and optional span class (trimmed). */
  className?: string;
};

export function dashboardCardHtml(props: DashboardCardProps): string {
  const spanCls =
    props.span === "2" ? " span-2" : props.span === "3" ? " span-3" : "";
  const userCls = props.className?.trim() ?? "";
  const sectionClass = userCls
    ? `card${spanCls} ${userCls}`.trim()
    : `card${spanCls}`.trim();

  const heading =
    props.title != null && props.title !== ""
      ? `<h2>${escapeHtml(props.title)}</h2>\n`
      : "";

  return `
<section class="${escapeHtml(sectionClass)}">
  ${heading}${props.bodyHtml}
</section>
`.trim();
}
