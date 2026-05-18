/**
 * Generic dashboard action button.
 * @see ADR-005
 */
import { escapeHtml } from "../shared/escapeHtml.js";

export type DashboardButtonProps = {
  label: string;
  id?: string;
  /** Concatenated after internal classes (trimmed). */
  className?: string;
  ariaLabel?: string;
};

export function dashboardButtonHtml(props: DashboardButtonProps): string {
  const idAttr = props.id ? ` id="${escapeHtml(props.id)}"` : "";
  const cls = props.className?.trim()
    ? ` class="${escapeHtml(props.className.trim())}"`
    : "";
  const aria =
    props.ariaLabel != null && props.ariaLabel !== ""
      ? ` aria-label="${escapeHtml(props.ariaLabel)}"`
      : "";
  return `<button type="button"${idAttr}${cls}${aria}>${escapeHtml(props.label)}</button>`;
}
