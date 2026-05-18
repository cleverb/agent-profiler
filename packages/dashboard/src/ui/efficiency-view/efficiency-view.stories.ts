import type { Meta, StoryObj } from "@storybook/html";

import {
  efficiencyViewHtml,
  type EfficiencyViewProps,
} from "./efficiency-view.js";

const meta = {
  title: "Dashboard/Views/EfficiencyView",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  render: (args: EfficiencyViewProps) => efficiencyViewHtml(args),
} satisfies Meta<EfficiencyViewProps>;

export default meta;

type Story = StoryObj<EfficiencyViewProps>;

export const Default: Story = {
  args: {
    scoreText: "76",
    sparklinePoints: "0,40 40,28 80,34 120,12 160,22 200,8",
  },
};

export const FlatSparkline: Story = {
  args: {
    scoreText: "62",
    sparklinePoints: "0,24 40,24 80,24 120,24 160,24 200,24",
  },
};
