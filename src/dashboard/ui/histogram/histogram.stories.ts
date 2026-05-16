import type { Meta, StoryObj } from "@storybook/html";

import { toolResultVerticalBarsHtml, type ToolHistogramProps } from ".";

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
      { label: "read_file", heightPct: 95 },
      { label: "grep", heightPct: 35 },
      { label: "run_terminal_cmd", heightPct: 55 },
      { label: "mcp.fetch", heightPct: 20 },
      { label: "other", heightPct: 10 },
    ],
  },
};

export const SingleDominant: Story = {
  args: {
    items: [{ label: "read_file", heightPct: 100 }],
  },
};
