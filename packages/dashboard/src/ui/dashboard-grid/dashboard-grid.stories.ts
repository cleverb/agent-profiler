import type { Meta, StoryObj } from "@storybook/html";

import {
  attachResponsiveDashboardGrids,
  dashboardGridHtml,
  type DashboardGridProps,
} from "./dashboard-grid.js";

const sampleCardsHtml = `
<section class="card card-a"><h2>Card A</h2></section>
<section class="card card-b"><h2>Card B</h2></section>
<section class="card card-c"><h2>Card C</h2></section>
<section class="card card-d"><h2>Card D</h2></section>
<section class="card card-e"><h2>Card E</h2></section>
<section class="card card-f"><h2>Card F</h2></section>
<section class="card card-g"><h2>Card G</h2></section>
<section class="card card-h"><h2>Card H</h2></section>
<section class="card card-i"><h2>Card I</h2></section>
<section class="card card-j"><h2>Card J</h2></section>
`.trim();

const meta = {
  title: "Dashboard/DashboardGrid",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  render: (args: DashboardGridProps) => {
    const root = document.createElement("div");
    root.innerHTML = dashboardGridHtml(args);
    attachResponsiveDashboardGrids(root);
    return root;
  },
} satisfies Meta<DashboardGridProps>;

export default meta;

type Story = StoryObj<DashboardGridProps>;

export const Default: Story = {
  args: {
    contentHtml: sampleCardsHtml,
  },
};

export const CustomTemplateAreas: Story = {
  args: {
    contentHtml: sampleCardsHtml,
    templateAreas: [
      "a a a a b b b b c c c c d d d",
      "a a a a b b b b c c c c d d d",
      "e e e e e f f f f f g g g g g",
      "e e e e e f f f f f g g g g g",
      "h h h i i i i i i i j j j j j",
      "h h h i i i i i i i j j j j j",
      "h h h i i i i i i i j j j j j",
      "h h h i i i i i i i j j j j j",
      "h h h i i i i i i i j j j j j",
      "h h h i i i i i i i j j j j j",
      "h h h i i i i i i i j j j j j",
      "h h h i i i i i i i j j j j j",
    ],
  },
};

export const BreakpointTemplateAreas: Story = {
  args: {
    contentHtml: sampleCardsHtml,
    templateAreas: {
      maxMobile: [
        "a a a a b b b b c c c c d d d",
        "a a a a b b b b c c c c d d d",
        "e e e e e f f f f f g g g g g",
        "e e e e e f f f f f g g g g g",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
      ],
      maxTablet: [
        "a a a a b b b b c c c c d d d",
        "a a a a b b b b c c c c d d d",
        "e e e e e f f f f f g g g g g",
        "e e e e e f f f f f g g g g g",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
      ],
      maxLaptop: [
        "a a a a b b b b c c c c d d d",
        "a a a a b b b b c c c c d d d",
        "e e e e e f f f f f g g g g g",
        "e e e e e f f f f f g g g g g",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
      ],
      maxDesktop: [
        "a a a a b b b b c c c c d d d",
        "a a a a b b b b c c c c d d d",
        "e e e e e f f f f f g g g g g",
        "e e e e e f f f f f g g g g g",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
        "h h h i i i i i i i j j j j j",
      ],
      cutoffWidths: {
        maxMobile: 480,
        maxTablet: 768,
        maxLaptop: 1024,
      },
    },
  },
};
