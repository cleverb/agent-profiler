import type { Meta, StoryObj } from "@storybook/html";

import {
  dashboardCardHtml,
  type DashboardCardProps,
} from "./dashboard-card.js";

const meta = {
  title: "Dashboard/UIComponents/Card",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    bodyHtml: '<p class="muted small">Card body placeholder.</p>',
  },
  render: (args: DashboardCardProps) => dashboardCardHtml(args),
} satisfies Meta<DashboardCardProps>;

export default meta;

type Story = StoryObj<DashboardCardProps>;

export const WithTitle: Story = {
  args: {
    title: "Panel title",
    bodyHtml: '<p class="muted small">Body content.</p>',
  },
};

export const SpanTwo: Story = {
  args: {
    title: "Wide panel",
    span: "2",
    bodyHtml: '<p class="muted small">Uses span-2 grid placement.</p>',
  },
};

export const ExtraClasses: Story = {
  args: {
    title: "Custom outline",
    className: "custom-demo-card",
    bodyHtml: '<p class="muted small">Extra class merged into section.</p>',
  },
};

export const BodyOnly: Story = {
  args: {
    bodyHtml: "<p>No heading — only body markup inside the card shell.</p>",
  },
};
