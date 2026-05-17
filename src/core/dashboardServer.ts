import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getDefaultDbPath,
  getEventsForLegacyRepoWindow,
  getEventsForSession,
  getLatestSessionDescriptor,
  getLegacyRepoTimeline,
  getSessionTimeline,
  listRecentSessions,
  openDb,
  type StoredEvent,
} from "./db.js";
import { analyzeSession } from "./sessionAnalytics.js";
import { runContextAudit } from "./contextAudit.js";
import { getLocalProfileDir } from "./profile.js";

/** Bump when bundled dashboard assets change so consumers pick up updates. */
export const DASHBOARD_ASSETS_VERSION = "3";

/**
 * Built CLI reads `dist/dashboard/` (flat). Development sources live under
 * `packages/dashboard/public/` (HTML/CSS); the browser bundle is built into
 * `packages/dashboard/dist/` then copied beside those assets in `dist/dashboard/`.
 */
export function resolvePackagedDashboardDir(): string {
  const coreDir = path.dirname(fileURLToPath(import.meta.url));
  const dashboardRoot = path.join(coreDir, "..", "dashboard");
  const nestedPublic = path.join(dashboardRoot, "public");
  if (fs.existsSync(path.join(dashboardRoot, "index.html"))) {
    return dashboardRoot;
  }
  if (fs.existsSync(path.join(nestedPublic, "index.html"))) {
    return nestedPublic;
  }
  return dashboardRoot;
}

export function resolveProjectDashboardDir(cwd = process.cwd()): string {
  return path.join(getLocalProfileDir(cwd), "dashboard");
}

export function syncDashboardAssets(
  packageDashboardDir: string,
  targetDir: string,
): void {
  if (!fs.existsSync(packageDashboardDir)) {
    throw new Error(
      `Dashboard assets missing at ${packageDashboardDir}. Run npm run build.`,
    );
  }
  if (!fs.existsSync(path.join(packageDashboardDir, "index.html"))) {
    throw new Error(
      `Dashboard assets incomplete at ${packageDashboardDir} (missing index.html). Run npm run build.`,
    );
  }
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });
  fs.cpSync(packageDashboardDir, targetDir, { recursive: true, force: true });
  fs.writeFileSync(
    path.join(targetDir, ".agent-profiler-dashboard-version"),
    `${DASHBOARD_ASSETS_VERSION}\n`,
    "utf8",
  );
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

function safeJoinStatic(root: string, requestPath: string): string | null {
  const trimmed = requestPath.replace(/^\/+/, "") || "index.html";
  const segments = trimmed.split("/").filter((s) => s.length > 0 && s !== ".");
  if (segments.some((s) => s === "..")) return null;
  const rootNorm = path.normalize(path.resolve(root));
  const resolved = path.normalize(path.resolve(rootNorm, ...segments));
  const rel = path.relative(rootNorm, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return resolved;
}

function sendJson(
  res: http.ServerResponse,
  status: number,
  body: unknown,
): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

function readQuery(url: URL): Record<string, string> {
  const out: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function resolveLatestEvents(
  db: Parameters<typeof getLatestSessionDescriptor>[0],
): StoredEvent[] {
  const desc = getLatestSessionDescriptor(db);
  if (!desc) return [];
  if (desc.sessionId && desc.sessionId.trim().length > 0) {
    return getEventsForSession(db, desc.source, desc.sessionId);
  }
  return getEventsForLegacyRepoWindow(db, desc.source, desc.repoPath);
}

function resolveSessionEvents(
  db: Parameters<typeof getLatestSessionDescriptor>[0],
  source: string,
  sessionId: string | undefined,
  repoPath: string | null | undefined,
  legacy: boolean,
): StoredEvent[] {
  if (legacy || !sessionId || sessionId.trim() === "") {
    return getEventsForLegacyRepoWindow(db, source, repoPath ?? null);
  }
  return getEventsForSession(db, source, sessionId);
}

/** Defaults to latest session when `source` omitted from query. */
function resolveSessionQueryParams(
  db: Parameters<typeof getLatestSessionDescriptor>[0],
  q: Record<string, string>,
): {
  source: string;
  sessionId: string | undefined;
  repoPath: string | null;
  legacy: boolean;
} | null {
  let source = q.source ?? "";
  let sessionId: string | undefined = q.sessionId;
  let repoPath: string | null | undefined =
    q.repoPath !== undefined
      ? q.repoPath.length > 0
        ? q.repoPath
        : null
      : undefined;
  let legacy = q.legacy === "1" || q.legacy === "true";

  if (!source) {
    const desc = getLatestSessionDescriptor(db);
    if (!desc) return null;
    source = desc.source;
    sessionId = desc.sessionId ?? undefined;
    repoPath = desc.repoPath ?? null;
    legacy = !sessionId || sessionId.trim() === "";
  } else if (
    (legacy || !sessionId || sessionId.trim() === "") &&
    repoPath === undefined
  ) {
    const desc = getLatestSessionDescriptor(db);
    if (desc && desc.source === source) {
      repoPath = desc.repoPath ?? null;
    }
  }

  return {
    source,
    sessionId,
    repoPath: repoPath ?? null,
    legacy,
  };
}

function toolHistogramFromEvents(
  events: StoredEvent[],
): { bucket: string; count: number }[] {
  const sizes = events
    .filter(
      (e) =>
        e.sourceEvent === "PostToolUse" ||
        e.sourceEvent === "PostToolUseFailure",
    )
    .map((e) => e.estimatedTotalTokens);
  const buckets = [
    { label: "0–2k", min: 0, max: 2000 },
    { label: "2k–10k", min: 2001, max: 10000 },
    { label: "10k–50k", min: 10001, max: 50000 },
    { label: "50k+", min: 50001, max: Infinity },
  ];
  const counts = buckets.map((b) => ({ bucket: b.label, count: 0 }));
  for (const t of sizes) {
    const idx = buckets.findIndex((b) => t >= b.min && t <= b.max);
    if (idx >= 0) counts[idx].count += 1;
  }
  return counts;
}

export type DashboardServerOptions = {
  host: string;
  port: number;
  staticRoot: string;
  cwd: string;
};

export function createDashboardServer(
  options: DashboardServerOptions,
): http.Server {
  const { staticRoot, cwd } = options;

  const server = http.createServer((req, res) => {
    const urlRaw = req.url ?? "/";
    let pathname = urlRaw;
    try {
      const u = new URL(urlRaw, `http://${req.headers.host ?? "localhost"}`);
      pathname = u.pathname;
      const url = u;

      if (pathname.startsWith("/api/")) {
        const dbPath = getDefaultDbPath();
        let db: ReturnType<typeof openDb>;
        try {
          db = openDb(dbPath);
        } catch (e) {
          sendJson(res, 500, { error: String(e) });
          return;
        }

        try {
          if (pathname === "/api/overview") {
            const events = resolveLatestEvents(db);
            const report = analyzeSession(events, { contextAuditRoot: cwd });
            const desc = getLatestSessionDescriptor(db);
            sendJson(res, 200, {
              databasePath: dbPath,
              descriptor: desc,
              report,
            });
            return;
          }

          if (pathname === "/api/session/report") {
            const resolved = resolveSessionQueryParams(db, readQuery(url));
            if (!resolved) {
              sendJson(res, 200, { report: null });
              return;
            }
            const events = resolveSessionEvents(
              db,
              resolved.source,
              resolved.sessionId,
              resolved.repoPath,
              resolved.legacy,
            );
            const report = analyzeSession(events, { contextAuditRoot: cwd });
            sendJson(res, 200, { report });
            return;
          }

          if (pathname === "/api/sessions") {
            const q = readQuery(url);
            const limit = Math.min(
              100,
              Math.max(1, parseInt(q.limit ?? "20", 10) || 20),
            );
            const rows = listRecentSessions(db, limit);
            sendJson(res, 200, { sessions: rows });
            return;
          }

          if (pathname === "/api/session/timeline") {
            const q = readQuery(url);
            const resolved = resolveSessionQueryParams(db, q);
            if (!resolved) {
              sendJson(res, 200, { timeline: [] });
              return;
            }
            const { source, sessionId, repoPath, legacy } = resolved;

            const timeline =
              legacy || !sessionId || sessionId.trim() === ""
                ? getLegacyRepoTimeline(db, source, repoPath)
                : getSessionTimeline(db, source, sessionId);

            sendJson(res, 200, { timeline });
            return;
          }

          if (pathname === "/api/tool-histogram") {
            const q = readQuery(url);
            const resolved = resolveSessionQueryParams(db, q);
            if (!resolved) {
              sendJson(res, 200, { histogram: [] });
              return;
            }
            const { source, sessionId, repoPath, legacy } = resolved;

            const events = resolveSessionEvents(
              db,
              source,
              sessionId,
              repoPath,
              legacy,
            );
            sendJson(res, 200, { histogram: toolHistogramFromEvents(events) });
            return;
          }

          if (pathname === "/api/context-audit") {
            sendJson(res, 200, runContextAudit(cwd));
            return;
          }

          if (pathname === "/api/score-history") {
            const q = readQuery(url);
            const limit = Math.min(
              50,
              Math.max(1, parseInt(q.limit ?? "15", 10) || 15),
            );
            const sessions = listRecentSessions(db, limit);
            const points: {
              endedAt: string;
              efficiencyScore: number;
              sessionId: string;
            }[] = [];
            for (const s of sessions) {
              const ev = getEventsForSession(db, s.source, s.sessionId);
              const report = analyzeSession(ev, { contextAuditRoot: cwd });
              if (report) {
                points.push({
                  endedAt: s.endedAt,
                  efficiencyScore: report.efficiencyScore,
                  sessionId: s.sessionId,
                });
              }
            }
            points.sort((a, b) => a.endedAt.localeCompare(b.endedAt));
            sendJson(res, 200, { points });
            return;
          }

          sendJson(res, 404, { error: "not found" });
        } finally {
          db.close();
        }
        return;
      }

      const filePath = safeJoinStatic(staticRoot, pathname);
      if (!filePath) {
        res.writeHead(403).end();
        return;
      }

      let diskPath = filePath;
      if (fs.existsSync(diskPath) && fs.statSync(diskPath).isDirectory()) {
        diskPath = path.join(diskPath, "index.html");
      }

      if (!fs.existsSync(diskPath) || !fs.statSync(diskPath).isFile()) {
        res.writeHead(404).end("Not found");
        return;
      }

      const ext = path.extname(diskPath).toLowerCase();
      const type = MIME[ext] ?? "application/octet-stream";
      const stream = fs.createReadStream(diskPath);
      res.writeHead(200, {
        "Content-Type": type,
        // Local dashboard: always revalidate so fixes to app.js/CSS show up without fighting browser cache.
        "Cache-Control": "no-store",
      });
      stream.pipe(res);
    } catch {
      res.writeHead(400).end();
    }
  });

  return server;
}

export function listenDashboardServer(
  server: http.Server,
  host: string,
  port: number,
): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const addr = server.address();
      const resolvedPort =
        typeof addr === "object" && addr !== null && "port" in addr
          ? (addr as { port: number }).port
          : port;
      resolve({ url: `http://${host}:${resolvedPort}` });
    });
  });
}
