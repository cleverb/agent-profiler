/** @type { import('@storybook/html-vite').StorybookConfig } */
const config = {
  stories: ["../stories/**/*.stories.@(js|mjs)"],
  addons: [],
  framework: {
    name: "@storybook/html-vite",
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
};

export default config;
