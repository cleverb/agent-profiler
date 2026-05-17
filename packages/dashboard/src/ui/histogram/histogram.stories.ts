import type { Meta, StoryObj } from "@storybook/html";

import {
  toolResultVerticalBarsHtml,
  type ToolHistogramProps,
} from "./index.js";

const meta = {
  title: "Dashboard/ToolHistogram",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  render: (args: ToolHistogramProps) => toolResultVerticalBarsHtml(args),
} satisfies Meta<ToolHistogramProps>;

export default meta;

type Story = StoryObj<ToolHistogramProps>;

export const Default: Story = {
  args: {},
};

export const LongTail: Story = {
  args: {
    title: "Tool result sizes",
    maxWidth: "560px",
    items: [
      { label: "read_file", heightPct: 95, valueText: "120" },
      { label: "grep", heightPct: 35, valueText: "40" },
      { label: "run_terminal_cmd", heightPct: 55, valueText: "55" },
      { label: "mcp.fetch", heightPct: 20, valueText: "12" },
      { label: "other", heightPct: 10, valueText: "3" },
    ],
  },
};

export const SingleDominant: Story = {
  args: {
    items: [{ label: "read_file", heightPct: 100, valueText: "42" }],
  },
};
