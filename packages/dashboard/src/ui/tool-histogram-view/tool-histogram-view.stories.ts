import type { Meta, StoryObj } from "@storybook/html";

import {
  toolHistogramViewHtml,
  type ToolHistogramViewProps,
} from "./tool-histogram-view.js";

const barsHtml = `
<div class="vbar-col"><div class="vbar-track"><div class="vbar-fill" style="height:95%"></div></div><span>120</span><span class="vbar-label">read_file</span></div>
<div class="vbar-col"><div class="vbar-track"><div class="vbar-fill" style="height:55%"></div></div><span>55</span><span class="vbar-label">run_terminal_cmd</span></div>
<div class="vbar-col"><div class="vbar-track"><div class="vbar-fill" style="height:35%"></div></div><span>40</span><span class="vbar-label">grep</span></div>
`.trim();

const meta = {
  title: "Dashboard/Views/ToolHistogramView",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  render: (args: ToolHistogramViewProps) => toolHistogramViewHtml(args),
} satisfies Meta<ToolHistogramViewProps>;

export default meta;

type Story = StoryObj<ToolHistogramViewProps>;

export const Default: Story = {
  args: {
    barsHtml,
    parityLineText: "Lifecycle parity: 12 requests, 11 successes, 1 failures",
    operationLineText: "Top operations: read_file 1,200 · grep 430 · shell 200",
  },
};
