import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(
  npmCommand,
  [
    "exec",
    "--yes",
    "--package=storybook",
    "--package=@storybook/html-vite",
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
      STORYBOOK_DISABLE_TELEMETRY: "1",
    },
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
