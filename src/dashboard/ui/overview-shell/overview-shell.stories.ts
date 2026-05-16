import type { Meta, StoryObj } from "@storybook/html";

import { overviewShellHtml, type OverviewShellProps } from ".";

const meta = {
  title: "Dashboard/OverviewShell",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  render: (args: OverviewShellProps) => overviewShellHtml(args),
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
