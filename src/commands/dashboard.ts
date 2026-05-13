import {
  createDashboardServer,
  listenDashboardServer,
  resolvePackagedDashboardDir,
  resolveProjectDashboardDir,
  syncDashboardAssets,
} from "../core/dashboardServer.js";

export type DashboardCliOptions = {
  host: string;
  port: number;
};

export function runDashboard(options: DashboardCliOptions): void {
  const cwd = process.cwd();
  const packaged = resolvePackagedDashboardDir();
  const target = resolveProjectDashboardDir(cwd);
  syncDashboardAssets(packaged, target);

  const server = createDashboardServer({
    host: options.host,
    port: options.port,
    staticRoot: target,
    cwd,
  });

  void listenDashboardServer(server, options.host, options.port).then(
    ({ url }) => {
      console.log(`Agent Profiler dashboard: ${url}`);
      console.log("Press Ctrl+C to stop.");
    },
  );
}
