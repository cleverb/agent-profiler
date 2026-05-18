import type { Meta, StoryObj } from "@storybook/html";

import { timelineViewHtml, type TimelineViewProps } from "./timeline-view.js";

const defaultTrackHtml = `
<span class="timeline-seg user" style="flex: 2"></span>
<span class="timeline-seg assistant" style="flex: 3"></span>
<span class="timeline-seg tool" style="flex: 2"></span>
<span class="timeline-seg shell" style="flex: 1"></span>
<span class="timeline-seg other" style="flex: 1"></span>
`.trim();

const meta = {
  title: "Dashboard/Views/TimelineView",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  render: (args: TimelineViewProps) => timelineViewHtml(args),
} satisfies Meta<TimelineViewProps>;

export default meta;

type Story = StoryObj<TimelineViewProps>;

export const Default: Story = {
  args: {
    metaLine: "56 turns · 24 edits · 12 shell · 15 tool calls · 18.2 min",
    trackHtml: defaultTrackHtml,
  },
};

export const Empty: Story = {
  args: {
    metaLine: "",
    trackHtml: "",
  },
};
