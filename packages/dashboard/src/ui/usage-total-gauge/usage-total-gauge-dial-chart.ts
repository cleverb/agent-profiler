/**
 * Imperative Chart.js half-doughnut for the observable token gauge dial.
 * String templates omit canvas logic (ADR-005).
 */
import { ArcElement, Chart, DoughnutController, Tooltip } from "chart.js";

Chart.register(DoughnutController, ArcElement, Tooltip);

export type UsageDialChartSegmentInput = {
  /** Non-negative magnitude; arcs scale by sum across segments */
  value: number;
  /** Resolved color or omit to use muted fallback */
  color?: string;
};

const chartsByCanvas = new WeakMap<HTMLCanvasElement, Chart>();

export function detachUsageDialChart(canvas: HTMLCanvasElement): void {
  const prev = chartsByCanvas.get(canvas);
  if (!prev) return;
  prev.destroy();
  chartsByCanvas.delete(canvas);
}

/** Call before assigning `innerHTML` on a subtree that contains dial canvases. */
export function detachUsageDialChartsIn(root: Element): void {
  for (const node of root.querySelectorAll('canvas[data-gauge-dial="1"]')) {
    if (node instanceof HTMLCanvasElement) detachUsageDialChart(node);
  }
}

function readCssColor(name: string, fallbackHex: string): string {
  if (typeof document === "undefined") return fallbackHex;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v !== "" ? v : fallbackHex;
}

function arcBorderHex(): string {
  return readCssColor("--surface", "#181b24");
}

function resolveSegmentColor(seg: UsageDialChartSegmentInput): string {
  if (seg.color && seg.color.trim() !== "") return seg.color.trim();
  return readCssColor("--other", "#5c6370");
}

/** Mirrors `.bar-fill.*` hues using dashboard CSS variables (theme-aware). */
export function defaultUsageDialSegmentsFromUsage(usage: {
  input: number;
  output: number;
  toolResults: number;
  toolLifecycleOutputs?: number;
  shellOutput: number;
}): UsageDialChartSegmentInput[] {
  const tool = usage.toolLifecycleOutputs ?? usage.toolResults;
  return [
    {
      value: Math.max(0, usage.input),
      color: readCssColor("--assistant", "#6c9fff"),
    },
    {
      value: Math.max(0, usage.output),
      color: readCssColor("--bar-output", "#8ab4ff"),
    },
    {
      value: Math.max(0, tool),
      color: readCssColor("--tool", "#e8a23a"),
    },
    {
      value: Math.max(0, usage.shellOutput),
      color: readCssColor("--shell", "#c678f0"),
    },
  ];
}

export function attachUsageDialChart(
  canvas: HTMLCanvasElement,
  segments: UsageDialChartSegmentInput[],
): Chart | null {
  detachUsageDialChart(canvas);

  let data = segments.map((s) => Math.max(0, Number(s.value) || 0));

  let backgroundColor: string[];
  if (segments.length === 0) {
    data = [1];
    backgroundColor = [readCssColor("--muted", "#8b93a7")];
  } else if (data.every((v) => v === 0)) {
    data = segments.map(() => 1);
    backgroundColor = segments.map((s) => resolveSegmentColor(s));
  } else {
    backgroundColor = segments.map((s) => resolveSegmentColor(s));
  }

  const borderColor = arcBorderHex();
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      datasets: [
        {
          data,
          backgroundColor,
          borderWidth: 2,
          borderColor,
          hoverBorderColor: borderColor,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      rotation: -90,
      circumference: 180,
      cutout: "85%",
      animation: { duration: 450 },
      layout: { padding: 0 },
    },
  });

  chartsByCanvas.set(canvas, chart);
  return chart;
}
