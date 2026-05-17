import type { Meta, StoryObj } from "@storybook/html";

import {
  usageBreakdownBarsInnerHtml,
  type UsageBreakdownBarsInnerProps,
} from "./usage-breakdown-bars.js";

const sampleRows = [
  { label: "Input", widthPct: 72, tokens: 41200, variant: "input" as const },
  { label: "Output", widthPct: 55, tokens: 31800, variant: "output" as const },
  {
    label: "Tool / MCP",
    widthPct: 38,
    tokens: 22100,
    variant: "tool" as const,
  },
  { label: "Shell", widthPct: 12, tokens: 6900, variant: "shell" as const },
];

const meta = {
  title: "Dashboard/UsageBreakdownBars",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  render: (args: UsageBreakdownBarsInnerProps) =>
    `<div class="bars">${usageBreakdownBarsInnerHtml(args)}</div>`,
} satisfies Meta<UsageBreakdownBarsInnerProps>;

export default meta;

type Story = StoryObj<UsageBreakdownBarsInnerProps>;

export const FullNumbers: Story = {
  args: {
    rows: sampleRows,
    isAbbreviated: false,
  },
};

export const Abbreviated: Story = {
  args: {
    rows: sampleRows,
    isAbbreviated: true,
  },
};

export const EdgeSmall: Story = {
  args: {
    rows: [
      { label: "Input", widthPct: 60, tokens: 840, variant: "input" },
      { label: "Output", widthPct: 40, tokens: 560, variant: "output" },
    ],
    isAbbreviated: true,
  },
};

export const EdgeThousandsBand: Story = {
  args: {
    rows: [
      { label: "Shell", widthPct: 100, tokens: 6000, variant: "shell" },
      { label: "Tool / MCP", widthPct: 72, tokens: 6900, variant: "tool" },
    ],
    isAbbreviated: true,
  },
};

export const EdgeCeilTenK: Story = {
  args: {
    rows: [
      {
        label: "Tool / MCP",
        widthPct: 90,
        tokens: 41200,
        variant: "tool",
      },
    ],
    isAbbreviated: true,
  },
};
