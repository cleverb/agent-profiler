import type { Meta, StoryObj } from "@storybook/html";

import {
  attachUsageDialChart,
  defaultUsageDialSegmentsFromUsage,
} from "../usage-total-gauge/usage-total-gauge-dial-chart.js";
import { usageBreakdownBarsInnerHtml } from "../usage-breakdown/usage-breakdown-bars.js";
import {
  observableUsageViewHtml,
  type ObservableUsageViewProps,
} from "./observable-usage-view.js";

const defaultBarsHtml = usageBreakdownBarsInnerHtml({
  rows: [
    { label: "Input", widthPct: 72, tokens: 41200, variant: "input" },
    { label: "Output", widthPct: 55, tokens: 31800, variant: "output" },
    { label: "Tool / MCP", widthPct: 38, tokens: 22100, variant: "tool" },
    { label: "Shell", widthPct: 12, tokens: 6900, variant: "shell" },
  ],
  isAbbreviated: true,
});

function renderObservableUsage(args: ObservableUsageViewProps): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = observableUsageViewHtml(args);
  const canvas = root.querySelector('canvas[data-gauge-dial="1"]');
  if (canvas instanceof HTMLCanvasElement && args.showDialChart === true) {
    attachUsageDialChart(
      canvas,
      defaultUsageDialSegmentsFromUsage({
        input: 540_000,
        output: 337_500,
        toolResults: 270_000,
        shellOutput: 202_500,
      }),
    );
  }
  return root;
}

const meta = {
  title: "Dashboard/Views/ObservableUsageView",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  render: renderObservableUsage,
} satisfies Meta<ObservableUsageViewProps>;

export default meta;

type Story = StoryObj<ObservableUsageViewProps>;

export const Default: Story = {
  args: {
    valueText: "128,400",
    caption: "estimated total tokens",
    barsHtml: defaultBarsHtml,
  },
};

export const WithDialChart: Story = {
  args: {
    valueText: "1,350,000",
    caption: "Total Estimated Tokens:",
    showDialChart: true,
    barsHtml: defaultBarsHtml,
  },
};
