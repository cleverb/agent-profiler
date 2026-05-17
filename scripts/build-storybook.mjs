import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "dist-pages/storybook");
const storybookBin = path.join(
  root,
  "node_modules/.bin",
  process.platform === "win32" ? "storybook.cmd" : "storybook",
);

if (existsSync(storybookBin)) {
  const result = spawnSync(
    storybookBin,
    ["build", "--disable-telemetry", "-o", outDir],
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
}

await mkdir(outDir, { recursive: true });
await writeFile(
  path.join(outDir, "index.html"),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Agent Profiler Storybook</title>
    <style>
      :root { color-scheme: light; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f8fafc; color: #172033; }
      main { width: min(42rem, calc(100% - 2rem)); padding: 2rem; background: white; border: 1px solid #dbe3ef; border-radius: 1rem; box-shadow: 0 20px 50px rgb(15 23 42 / 0.08); }
      h1 { margin-top: 0; line-height: 1.1; }
      p { color: #5d6b82; line-height: 1.6; }
      code { background: #eef2ff; border-radius: 0.25rem; padding: 0.1rem 0.3rem; }
      a { color: #1d4ed8; }
    </style>
  </head>
  <body>
    <main>
      <h1>Storybook is ready for project stories.</h1>
      <p>This GitHub Pages endpoint is reserved for the static Storybook export. The repository does not currently install Storybook dependencies, so the Pages build emits this lightweight placeholder instead of fetching a transient Storybook toolchain.</p>
      <p>When the local Storybook setup is merged into the repository, install the Storybook packages and <code>npm run build:storybook</code> will publish the real static build here.</p>
      <p><a href="/">Back to Agent Profiler</a></p>
    </main>
  </body>
</html>
`,
);

console.log(`No local Storybook CLI found; wrote placeholder to ${outDir}`);
