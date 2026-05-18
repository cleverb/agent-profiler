import type { StorybookConfig } from "@storybook/html-vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ["../packages/dashboard/src/**/*.stories.@(js|ts)"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-themes",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest",
    "@storybook/addon-designs",
    "@vueless/storybook-dark-mode",
    "@storybook/addon-mcp",
    "storybook-addon-tag-badges",
    {
      // name: getAbsolutePath("@cleverb/storybook-addon-adr"),
      name: "storybook-addon-decision-records",
      options: {
        adrRoot: path.resolve(__dirname, "../docs/decisions"),
        categories: ["architecture", "process", "telemetry"],
        indexReadmePath: path.resolve(__dirname, "../docs/decisions/README.md"),
        repoRoot: path.resolve(__dirname, "../"),
        /** Manager tab label (min 3 chars; see addon `parsePanelLabel`). */
        panelLabel: "Architecture",
        // Optional: GitHub blob links in the ADR panel. Also supports env STORYBOOK_ADR_GITHUB_REPO and STORYBOOK_ADR_GITHUB_BRANCH when the manifest regenerates.
        // githubRepoUrl: 'https://github.com/org/repo',
        // githubBranch: 'main',
        /** e.g. `https://github.com/org/repo` (no `/blob`). From options or `STORYBOOK_ADR_GITHUB_REPO`. */
        // githubRepoUrl: 'https://github.com/cleverb/cleverboy',
        /** From options, `STORYBOOK_ADR_GITHUB_BRANCH`, or `main`. */
        // githubBranch: 'main',
        /** Regex (source only) against story tags; first matching tag that maps to an ADR wins. Default ADR-[0-9]+ */
        // tagMatchRegex: String.raw`ADR-\d{4}`,
      },
    },
  ],
  framework: {
    name: "@storybook/html-vite",
    options: {},
  },
};

export default config;
