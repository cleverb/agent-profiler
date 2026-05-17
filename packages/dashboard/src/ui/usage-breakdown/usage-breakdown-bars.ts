/**
 * Horizontal token breakdown rows for observable usage.
 * @see ADR-005
 */
import {
  usageBarsInnerHtml,
  type UsageBarRow,
  type UsageBarVariant,
} from "../usage-bars/usage-bars.js";
import {
  formatTokenCountAbbreviated,
  formatTokenCountFull,
} from "../shared/formatTokenCount.js";

export type UsageBreakdownBarRow = {
  label: string;
  /** 0–100, width of the filled bar */
  widthPct: number;
  tokens: number;
  variant?: UsageBarVariant;
};

export type UsageBreakdownBarsInnerProps = {
  rows: UsageBreakdownBarRow[];
  /** When true, uses abbreviated k-formatting from numeric tokens */
  isAbbreviated?: boolean;
};

function tokensFromUsageBarRow(row: UsageBarRow): number | null {
  const normalized = row.valueText.replace(/,/g, "").trim();
  const n = Number.parseInt(normalized, 10);
  return Number.isFinite(n) ? n : null;
}

/** Map numeric breakdown rows + abbreviation flag → horizontal bar HTML */
export function usageBreakdownBarsInnerHtml(
  props: UsageBreakdownBarsInnerProps,
): string {
  const abbreviated = props.isAbbreviated === true;
  const mapped: UsageBarRow[] = props.rows.map((r) => ({
    label: r.label,
    widthPct: r.widthPct,
    valueText: abbreviated
      ? formatTokenCountAbbreviated(r.tokens)
      : formatTokenCountFull(r.tokens),
    variant: r.variant,
  }));
  return usageBarsInnerHtml(mapped);
}

/**
 * Merge optional numeric breakdown with legacy string rows for overview shell.
 */
export function usageRowsToBreakdownInnerHtml(
  rows: UsageBarRow[],
  opts: { isAbbreviated?: boolean },
): string {
  const abbreviated = opts.isAbbreviated === true;
  const mapped: UsageBarRow[] = rows.map((row) => {
    const parsed = tokensFromUsageBarRow(row);
    const tokens = parsed ?? 0;
    const valueText = abbreviated
      ? parsed != null
        ? formatTokenCountAbbreviated(tokens)
        : row.valueText
      : row.valueText;
    return { ...row, valueText };
  });
  return usageBarsInnerHtml(mapped);
}
