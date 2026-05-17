import type { Meta, StoryObj } from "@storybook/html";

import {
  efficiencyInnerHtml,
  type EfficiencyInnerProps,
} from "./efficiency-inner.js";

const meta = {
  title: "Dashboard/EfficiencyInner",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  render: (args: EfficiencyInnerProps) => efficiencyInnerHtml(args),
} satisfies Meta<EfficiencyInnerProps>;

export default meta;

type Story = StoryObj<EfficiencyInnerProps>;

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
