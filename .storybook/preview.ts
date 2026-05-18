import type { Preview } from "@storybook/html";

import "@picocss/pico/css/pico.min.css";
import "../packages/dashboard/src/styles/dashboard.scss";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Dashboard color theme",
      defaultValue: "dark",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (storyFn, context) => {
      const theme = context.globals.theme === "light" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.style.colorScheme = theme;
      return storyFn();
    },
  ],
};

export default preview;
