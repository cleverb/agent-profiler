import type { Meta, StoryObj } from "@storybook/html";

import {
  recommendationsViewHtml,
  type RecommendationsViewProps,
} from "./recommendations-view.js";

const meta = {
  title: "Dashboard/Views/RecommendationsView",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  render: (args: RecommendationsViewProps) => recommendationsViewHtml(args),
} satisfies Meta<RecommendationsViewProps>;

export default meta;

type Story = StoryObj<RecommendationsViewProps>;

export const Default: Story = {
  args: {
    listHtml:
      "<li>Promote repeated grep + read_file chain into a helper command.</li><li>Cap tool response size for verbose operations.</li><li>Review high-churn prompts for narrower context usage.</li>",
  },
};
