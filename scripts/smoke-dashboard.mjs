import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const dashboardServerPath = path.join(
  repoRoot,
  "dist",
  "core",
  "dashboardServer.js",
);

if (!fs.existsSync(dashboardServerPath)) {
  console.error("Run `npm run build` first.");
  process.exit(1);
}

const tmpHome = fs.mkdtempSync(
  path.join(os.tmpdir(), "agent-profiler-dash-smoke-"),
);
const prevCwd = process.cwd();
const prevHome = process.env.HOME;
const prevDbPath = process.env.AGENT_PROFILER_DB_PATH;

/** @type {import('node:http').Server | undefined} */
let server;

try {
  delete process.env.AGENT_PROFILER_DB_PATH;
  process.env.HOME = tmpHome;
  process.chdir(tmpHome);

  const mod = await import(pathToFileURL(dashboardServerPath).href);
  const {
    syncDashboardAssets,
    resolvePackagedDashboardDir,
    resolveProjectDashboardDir,
    createDashboardServer,
    listenDashboardServer,
  } = mod;

  syncDashboardAssets(
    resolvePackagedDashboardDir(),
    resolveProjectDashboardDir(tmpHome),
  );

  server = createDashboardServer({
    host: "127.0.0.1",
    port: 0,
    staticRoot: resolveProjectDashboardDir(tmpHome),
    cwd: tmpHome,
  });

  const { url } = await listenDashboardServer(server, "127.0.0.1", 0);

  const overview = await fetch(`${url}/api/overview`);
  if (!overview.ok) {
    throw new Error(`/api/overview returned ${overview.status}`);
  }

  console.log("Dashboard smoke checks passed.");
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  server?.close();
  process.chdir(prevCwd);
  if (prevHome === undefined) delete process.env.HOME;
  else process.env.HOME = prevHome;
  if (prevDbPath === undefined) delete process.env.AGENT_PROFILER_DB_PATH;
  else process.env.AGENT_PROFILER_DB_PATH = prevDbPath;
  fs.rmSync(tmpHome, { recursive: true, force: true });
}
