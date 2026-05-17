import type { Meta, StoryObj } from "@storybook/html";

import {
  attachUsageDialChart,
  defaultUsageDialSegmentsFromUsage,
} from "../usage-total-gauge/usage-total-gauge-dial-chart.js";
import { overviewShellHtml, type OverviewShellProps } from "./index.js";

function renderOverviewHtml(args: OverviewShellProps): HTMLElement {
  const wrap = document.createElement("div");
  wrap.innerHTML = overviewShellHtml(args);
  const canvas = wrap.querySelector('canvas[data-gauge-dial="1"]');
  if (
    canvas instanceof HTMLCanvasElement &&
    args.showDialChart === true &&
    args.usageDialSegments != null &&
    args.usageDialSegments.length > 0
  ) {
    attachUsageDialChart(canvas, args.usageDialSegments);
  }
  return wrap;
}

const meta = {
  title: "Dashboard/OverviewShell",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  render: renderOverviewHtml,
} satisfies Meta<OverviewShellProps>;

export default meta;

type Story = StoryObj<OverviewShellProps>;

/** Default mock data (see `overviewShellHtml` defaults). */
export const Default: Story = {
  args: {},
};

/** High tool/shell share for a different visual profile. */
export const ToolHeavySession: Story = {
  args: {
    subtitle: "Storybook · tool-heavy session",
    totalTokensValue: "502,100",
    totalTokensCaption: "estimated total tokens",
    efficiencyScore: "54",
    sparklinePoints: "0,42 40,38 80,40 120,36 160,34 200,32",
    usageRows: [
      { label: "Input", widthPct: 28, valueText: "12,400", variant: "input" },
      { label: "Output", widthPct: 22, valueText: "9,800", variant: "output" },
      {
        label: "Tool / MCP",
        widthPct: 92,
        valueText: "412,000",
        variant: "tool",
      },
      { label: "Shell", widthPct: 45, valueText: "67,900", variant: "shell" },
    ],
    sessionOptions: ["tool-heavy-run", "baseline"],
  },
};

/** Abbreviated category counts parsed from `usageRows` value strings. */
export const AbbreviatedFromStrings: Story = {
  args: {
    subtitle: "Storybook · abbreviated category counts",
    usageAbbreviated: true,
  },
};

/** Numeric breakdown rows + abbreviated formatting (ceil-k ≥10k). */
export const NumericBreakdownAbbreviated: Story = {
  args: {
    subtitle: "Storybook · numeric breakdown API",
    usageAbbreviated: true,
    usageBreakdownRows: [
      { label: "Input", widthPct: 72, tokens: 41200, variant: "input" },
      { label: "Output", widthPct: 55, tokens: 31800, variant: "output" },
      { label: "Tool / MCP", widthPct: 38, tokens: 22100, variant: "tool" },
      { label: "Shell", widthPct: 12, tokens: 6900, variant: "shell" },
    ],
  },
};

/** Fewer usage rows (edge-case density). */
export const MinimalUsage: Story = {
  args: {
    subtitle: "Storybook · minimal rows",
    usageRows: [
      { label: "Input", widthPct: 60, valueText: "100", variant: "input" },
      { label: "Output", widthPct: 40, valueText: "80", variant: "output" },
    ],
  },
};

/** Half-doughnut token dial (Chart.js) over centered caption + total. */
export const WithTokenDialGauge: Story = {
  args: {
    subtitle: "Storybook · Chart.js gauge dial enabled",
    usageAbbreviated: true,
    totalTokensValue: "1,350,000",
    totalTokensCaption: "Total Estimated Tokens:",
    showDialChart: true,
    usageDialSegments: defaultUsageDialSegmentsFromUsage({
      input: 540_000,
      output: 337_500,
      toolResults: 270_000,
      shellOutput: 202_500,
    }),
  },
};
