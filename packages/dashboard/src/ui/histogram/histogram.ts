/**
 * Parameterized HTML fragments for vertical tool/context bars (Storybook + runtime inner HTML).
 */
import { escapeHtml } from "../shared/escapeHtml.js";

export type VerticalBarItem = {
  label: string;
  /** 0–100, bar fill height relative to `.vbar-track` */
  heightPct: number;
  /** Shown between track and label (e.g. formatted count or tokens). */
  valueText?: string;
};

export type ToolHistogramProps = {
  title?: string;
  maxWidth?: string;
  items?: VerticalBarItem[];
};

/** Inner HTML for `.bars.vertical` containers (e.g. `#tool-histogram`, `#context-bars`). */
export function verticalBarsInnerHtml(items: VerticalBarItem[]): string {
  return items
    .map((item) => {
      const h = Math.min(100, Math.max(0, Number(item.heightPct) || 0));
      const val =
        item.valueText != null && item.valueText !== ""
          ? escapeHtml(item.valueText)
          : "";
      return `
    <div class="vbar-col">
      <div class="vbar-track"><div class="vbar-fill" style="height: ${h}%"></div></div>
      <span>${val}</span>
      <span class="vbar-label">${escapeHtml(item.label)}</span>
    </div>`;
    })
    .join("");
}

const defaultHistogramItems: VerticalBarItem[] = [
  { label: "read_file", heightPct: 65, valueText: "12" },
  { label: "grep", heightPct: 40, valueText: "8" },
  { label: "semantic", heightPct: 90, valueText: "30" },
];

const defaultHistogramProps: Required<ToolHistogramProps> = {
  title: "Tool result sizes",
  maxWidth: "420px",
  items: defaultHistogramItems,
};

export function toolResultVerticalBarsHtml(
  props: ToolHistogramProps = {},
): string {
  const p = {
    ...defaultHistogramProps,
    ...props,
    items: props.items ?? defaultHistogramProps.items,
  };

  const inner = verticalBarsInnerHtml(p.items);

  return `
<section class="card" style="max-width: ${escapeHtml(p.maxWidth)}">
  <h2>${escapeHtml(p.title)}</h2>
  <div class="bars vertical">
    ${inner}
  </div>
</section>
`.trim();
}
