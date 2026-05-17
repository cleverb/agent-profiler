import type { Meta, StoryObj } from "@storybook/html";

import {
  usageTotalGaugeInnerHtml,
  type UsageTotalGaugeProps,
} from "./usage-total-gauge.js";

const meta = {
  title: "Dashboard/UsageTotalGauge",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  render: (args: UsageTotalGaugeProps) =>
    `<div class="gauge-row" style="justify-content:flex-start">${usageTotalGaugeInnerHtml(args)}</div>`,
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
