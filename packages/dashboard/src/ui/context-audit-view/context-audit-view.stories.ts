import type { Meta, StoryObj } from "@storybook/html";

import {
  contextAuditViewHtml,
  type ContextAuditViewProps,
} from "./context-audit-view.js";

const barsHtml = `
<div class="vbar-col"><div class="vbar-track"><div class="vbar-fill" style="height:100%"></div></div><span>4,820</span><span class="vbar-label">AGENTS.md</span></div>
<div class="vbar-col"><div class="vbar-track"><div class="vbar-fill" style="height:64%"></div></div><span>3,120</span><span class="vbar-label">README.md</span></div>
<div class="vbar-col"><div class="vbar-track"><div class="vbar-fill" style="height:37%"></div></div><span>1,820</span><span class="vbar-label">profile.ts</span></div>
`.trim();

const meta = {
  title: "Dashboard/Views/ContextAuditView",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  render: (args: ContextAuditViewProps) => contextAuditViewHtml(args),
} satisfies Meta<ContextAuditViewProps>;

export default meta;

type Story = StoryObj<ContextAuditViewProps>;

export const Default: Story = {
  args: {
    barsHtml,
  },
};
