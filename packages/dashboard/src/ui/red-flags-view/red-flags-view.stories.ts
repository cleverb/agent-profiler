import type { Meta, StoryObj } from "@storybook/html";

import { redFlagsViewHtml, type RedFlagsViewProps } from "./red-flags-view.js";

const meta = {
  title: "Dashboard/Views/RedFlagsView",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  render: (args: RedFlagsViewProps) => redFlagsViewHtml(args),
} satisfies Meta<RedFlagsViewProps>;

export default meta;

type Story = StoryObj<RedFlagsViewProps>;

export const Default: Story = {
  args: {
    listHtml:
      '<li><span class="sev">HIGH</span>Repeated shell retries: same command failed 8 times</li><li><span class="sev medium">MEDIUM</span>Large tool outputs: context churn likely</li>',
  },
};

export const None: Story = {
  args: {
    listHtml: '<li class="muted">None</li>',
  },
};
