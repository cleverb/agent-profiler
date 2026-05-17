import { spawnSync } from "node:child_process";

const storybookVersion = "8.6.14";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(
  npmCommand,
  [
    "exec",
    "--yes",
    `--package=storybook@${storybookVersion}`,
    `--package=@storybook/html-vite@${storybookVersion}`,
    `--package=@storybook/builder-vite@${storybookVersion}`,
    "--",
    "storybook",
    "build",
    "--disable-telemetry",
    "-o",
    "dist-pages/storybook",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      CI: "1",
      STORYBOOK_DISABLE_TELEMETRY: "1",
    },
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
