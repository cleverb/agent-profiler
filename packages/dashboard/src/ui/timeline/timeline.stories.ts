import type { Meta, StoryObj } from "@storybook/html";

import { timelineSampleSegmentsHtml, type TimelineCardProps } from "./index.js";

const meta = {
  title: "Dashboard/TimelineCard",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  render: (args: TimelineCardProps) => timelineSampleSegmentsHtml(args),
} satisfies Meta<TimelineCardProps>;

export default meta;

type Story = StoryObj<TimelineCardProps>;

export const Balanced: Story = {
  args: {},
};

export const ToolHeavy: Story = {
  args: {
    metaLine: "540 events · MCP-heavy stretch",
    segments: [
      { role: "user", flex: 1 },
      { role: "assistant", flex: 2 },
      { role: "tool", flex: 8 },
      { role: "assistant", flex: 2 },
      { role: "shell", flex: 1 },
      { role: "other", flex: 1 },
    ],
  },
};

export const ShortSession: Story = {
  args: {
    metaLine: "24 events · 1.2 min",
    maxWidth: "480px",
    segments: [
      { role: "user", flex: 3 },
      { role: "assistant", flex: 5 },
      { role: "tool", flex: 1 },
    ],
  },
};
