import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const cliPath = path.join(repoRoot, "dist", "cli.js");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"),
);
const tempHome = fs.mkdtempSync(
  path.join(os.tmpdir(), "agent-profiler-smoke-"),
);

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: tempHome,
    env: {
      ...process.env,
      AGENT_PROFILER_DB_PATH: path.join(tempHome, "events.sqlite"),
      HOME: tempHome,
    },
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(
      `CLI smoke check failed for ${args.join(" ")}\n${result.stderr || result.stdout || "no output"}`,
    );
  }

  return result.stdout.trim();
}

if (!fs.existsSync(cliPath)) {
  throw new Error(
    "Build output missing at dist/cli.js. Run `npm run build` first.",
  );
}

try {
  const version = runCli(["--version"]);
  if (version !== packageJson.version) {
    throw new Error(
      `Expected CLI version ${packageJson.version}, got ${version || "(empty output)"}`,
    );
  }
  runCli(["--help"]);
  runCli(["status", "--json"]);
  console.log("CLI smoke checks passed.");
} finally {
  fs.rmSync(tempHome, { recursive: true, force: true });
}
