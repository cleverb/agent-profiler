/**
 * Section chrome for dashboard panels.
 * @see ADR-005
 */
import { escapeHtml, classHelper } from "../shared";

export type DashboardCardSpan = "2" | "3";

export type DashboardCardProps = {
  /** Inner HTML only from escaped/trusted fragments at call sites. */
  bodyHtml: string;
  title?: string;
  span?: DashboardCardSpan;
  /** Optional DOM id on the `<section>`. */
  id?: string;
  /** Concatenated after `.card` and optional span class (trimmed). */
  className?: string;
};

export function dashboardCardHtml(props: DashboardCardProps): string {
  const spanNum = props.span === "2" ? 2 : props.span === "3" ? 3 : undefined;
  const componentClass = classHelper(
    "card",
    props.className?.trim() ?? "",
    spanNum,
  );

  const heading =
    props.title != null && props.title !== ""
      ? `<h2>${escapeHtml(props.title)}</h2>\n`
      : "";
  const idAttr =
    props.id != null && props.id !== "" ? ` id="${escapeHtml(props.id)}"` : "";

  return `
<section${idAttr} class="${escapeHtml(componentClass)}">
  ${heading}${props.bodyHtml}
</section>
`.trim();
}
