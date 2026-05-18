import type { Meta, StoryObj } from "@storybook/html";

import {
  attachUsageDialChart,
  defaultUsageDialSegmentsFromUsage,
} from "./usage-total-gauge-dial-chart.js";
import {
  usageTotalGaugeInnerHtml,
  type UsageTotalGaugeProps,
} from "./usage-total-gauge.js";

function wrapGaugeRow(inner: string): string {
  return `<div class="gauge-row" style="justify-content:flex-start">${inner}</div>`;
}

function renderGauge(args: UsageTotalGaugeProps): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = wrapGaugeRow(usageTotalGaugeInnerHtml(args));
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
  title: "Dashboard/UIComponents/UsageTotalGauge",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  render: renderGauge,
} satisfies Meta<UsageTotalGaugeProps>;

export default meta;

type Story = StoryObj<UsageTotalGaugeProps>;

export const Default: Story = {
  args: {
    valueText: "128,400",
    caption: "estimated total tokens",
  },
};

export const LargeValue: Story = {
  args: {
    valueText: "12,804,921",
    caption: "estimated total tokens",
  },
};

export const LongCaption: Story = {
  args: {
    valueText: "42k",
    caption: "estimated total tokens · blended across visible assistant turns",
  },
};

export const WithDialChart: Story = {
  args: {
    valueText: "1,350,000",
    caption: "Total Estimated Tokens:",
    showDialChart: true,
  },
};
