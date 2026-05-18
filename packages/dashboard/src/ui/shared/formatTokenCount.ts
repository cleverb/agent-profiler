/**
 * Token count display for dashboard UI.
 * Shared between Storybook helpers and optional runtime wiring.
 * @see ADR-005
 */

const fullFmt = new Intl.NumberFormat("en-US");

/** Full-format integers like live dashboard `fmt()` (no decimals). */
export function formatTokenCountFull(n: number): string {
  return fullFmt.format(Math.round(n));
}

/**
 * Compact display for large counts:
 * - ≥ 10_000: ceil to whole k, no decimal (e.g. 41_200 → "42k")
 * - 1_000–9_999: one decimal, trim trailing ".0" (e.g. 6_900 → "6.9k", 6_000 → "6k")
 * - &lt; 1_000: full Intl integer
 */
export function formatTokenCountAbbreviated(n: number): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  const rounded = Math.round(x);
  if (rounded >= 10_000) {
    return `${Math.ceil(rounded / 1000)}k`;
  }
  if (rounded >= 1000) {
    const k = rounded / 1000;
    const oneDecimal = Math.round(k * 10) / 10;
    const s = oneDecimal % 1 === 0 ? String(oneDecimal) : oneDecimal.toFixed(1);
    return `${s}k`;
  }
  return fullFmt.format(rounded);
}
