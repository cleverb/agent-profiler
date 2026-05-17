import type { Meta, StoryObj } from "@storybook/html";

import {
  dashboardButtonHtml,
  type DashboardButtonProps,
} from "./dashboard-button.js";

const meta = {
  title: "Dashboard/Button",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  render: (args: DashboardButtonProps) => dashboardButtonHtml(args),
} satisfies Meta<DashboardButtonProps>;

export default meta;

type Story = StoryObj<DashboardButtonProps>;

export const Default: Story = {
  args: { label: "Refresh" },
};

export const LongLabel: Story = {
  args: { label: "Refresh session overview from database" },
};

export const CustomClass: Story = {
  args: {
    label: "Action",
    className: "outline contrast",
  },
};
