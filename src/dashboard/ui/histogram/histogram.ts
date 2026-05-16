/**
 * Parameterized HTML fragments for timeline / histogram demos (Storybook).
 */
import { escapeHtml } from "../shared/escapeHtml.js";

export type VerticalBarItem = {
  label: string;
  /** 0–100 */
  heightPct: number;
};

export type ToolHistogramProps = {
  title?: string;
  maxWidth?: string;
  items?: VerticalBarItem[];
};

const defaultHistogramItems: VerticalBarItem[] = [
  { label: "read_file", heightPct: 65 },
  { label: "grep", heightPct: 40 },
  { label: "semantic", heightPct: 90 },
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

  const cols = p.items
    .map((item) => {
      const h = Math.min(100, Math.max(0, Number(item.heightPct) || 0));
      return `
    <div class="vbar-col">
      <div class="vbar-track"><div class="vbar-fill" style="height: ${h}%"></div></div>
      <span class="vbar-label">${escapeHtml(item.label)}</span>
    </div>`;
    })
    .join("");

  return `
<section class="card" style="max-width: ${escapeHtml(p.maxWidth)}">
  <h2>${escapeHtml(p.title)}</h2>
  <div class="bars vertical">
    ${cols}
  </div>
</section>
`.trim();
}
