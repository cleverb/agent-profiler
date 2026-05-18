import { escapeHtml } from "../shared/escapeHtml.js";

export type UsageBarVariant = "input" | "output" | "tool" | "shell";

export type UsageBarRow = {
  label: string;
  /** 0–100, width of the filled bar */
  widthPct: number;
  /** Shown at end of row (e.g. token count) */
  valueText: string;
  /** Bar color; when omitted, inferred from `label` */
  variant?: UsageBarVariant;
};

export function usageBarVariant(row: UsageBarRow): UsageBarVariant {
  if (row.variant) return row.variant;
  if (row.label === "Output") return "output";
  if (row.label.includes("Tool")) return "tool";
  if (row.label === "Shell") return "shell";
  return "input";
}

/** Inner HTML for `#usage-bars` (horizontal usage rows only). */
export function usageBarsInnerHtml(rows: UsageBarRow[]): string {
  return rows
    .map((row) => {
      const w = Math.min(100, Math.max(0, Number(row.widthPct) || 0));
      const cls = usageBarVariant(row);
      return `
          <div class="bar-row">
            <span>${escapeHtml(row.label)}</span>
            <div class="bar-track"><div class="bar-fill ${cls}" style="width:${w}%"></div></div>
            <span class="muted small">${escapeHtml(row.valueText)}</span>
          </div>`;
    })
    .join("");
}
