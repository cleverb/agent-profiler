import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function pick(obj, keys) {
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

function readSessionId(event) {
  return (
    pick(event, ["session_id", "sessionId"]) ??
    pick(event?.session, ["id"]) ??
    pick(event?.properties, ["sessionID", "sessionId"]) ??
    pick(event?.properties?.info, ["sessionID", "sessionId"])
  );
}

function readMessageRole(event) {
  const role =
    pick(event?.message, ["role"]) ??
    pick(event?.properties?.info, ["role"]) ??
    pick(event?.properties?.message, ["role"]) ??
    pick(event?.message?.author, ["role", "type"]) ??
    pick(event?.part?.author, ["role", "type"]) ??
    pick(event?.properties?.part?.author, ["role", "type"]) ??
    pick(event?.part, ["role"]) ??
    pick(event?.properties?.part, ["role"]) ??
    pick(event?.delta, ["role"]) ??
    pick(event?.properties?.delta, ["role"]) ??
    pick(event, ["role"]);
  if (!role) return undefined;
  const lower = role.toLowerCase();
  if (lower.includes("assistant")) return "assistant";
  if (lower.includes("user")) return "user";
  return undefined;
}

function mapEventType(event) {
  const type = pick(event, ["type", "event", "event_type", "name"]);
  if (!type) return "unknown.event";

  if (type === "message.updated") {
    const role = readMessageRole(event);
    if (role === "assistant") return "message.updated.assistant";
    if (role === "user") return "message.updated.user";
  }

  if (type === "tool.execute.after" && event?.error) {
    return "tool.execute.failure";
  }

  return type;
}

const FORWARDED_EVENTS = new Set([
  "session.created",
  "session.idle",
  "message.updated",
  "message.updated.user",
  "message.updated.assistant",
  "tool.execute.before",
  "tool.execute.after",
  "tool.execute.failure",
  "file.edited",
  "command.executed",
]);

function shouldForwardEvent(eventType) {
  return FORWARDED_EVENTS.has(eventType);
}

function resolveRepoPath(projectDirectory, event) {
  return (
    pick(event, [
      "repo_path",
      "repoPath",
      "directory",
      "cwd",
      "worktree",
      "workspacePath",
    ]) ??
    pick(event?.properties?.info?.path, ["root", "cwd"]) ??
    pick(event?.properties, ["cwd", "worktree"]) ??
    projectDirectory
  );
}

function runProfilerHook(projectDirectory, eventType, payload) {
  const dbPath = projectDirectory
    ? path.join(projectDirectory, ".agent-profiler", "events.sqlite")
    : undefined;
  const env = dbPath
    ? { ...process.env, AGENT_PROFILER_DB_PATH: dbPath }
    : process.env;

  const attemptGlobal = spawnSync(
    "agent-profiler",
    ["hook", "opencode", eventType],
    {
      input: JSON.stringify(payload),
      encoding: "utf8",
      env,
    },
  );

  if (attemptGlobal.status === 0 && !attemptGlobal.error) {
    return;
  }

  const localCliPath = path.join(projectDirectory ?? "", "dist", "cli.js");
  if (projectDirectory && fs.existsSync(localCliPath)) {
    const attemptLocal = spawnSync(
      process.execPath,
      [localCliPath, "hook", "opencode", eventType],
      {
        input: JSON.stringify(payload),
        encoding: "utf8",
        env,
      },
    );

    if (attemptLocal.status === 0 && !attemptLocal.error) {
      writeDebugLog(
        projectDirectory,
        `fallback local cli succeeded for event=${eventType} db=${dbPath ?? "default"}`,
      );
      return;
    }

    writeDebugLog(
      projectDirectory,
      [
        `hook command failed for event=${eventType}`,
        `global_status=${String(attemptGlobal.status)}`,
        `global_error=${attemptGlobal.error?.message ?? ""}`,
        `global_stderr=${(attemptGlobal.stderr ?? "").trim()}`,
        `local_status=${String(attemptLocal.status)}`,
        `local_error=${attemptLocal.error?.message ?? ""}`,
        `local_stderr=${(attemptLocal.stderr ?? "").trim()}`,
        `db=${dbPath ?? "default"}`,
      ].join(" | "),
    );
    return;
  }

  writeDebugLog(
    projectDirectory,
    [
      `global hook command failed for event=${eventType}`,
      `global_status=${String(attemptGlobal.status)}`,
      `global_error=${attemptGlobal.error?.message ?? ""}`,
      `global_stderr=${(attemptGlobal.stderr ?? "").trim()}`,
      "local_cli_unavailable=true",
      `db=${dbPath ?? "default"}`,
    ].join(" | "),
  );
}

function writeDebugLog(projectDirectory, message) {
  const baseDir = projectDirectory || process.cwd();
  if (!baseDir) return;
  try {
    const profilerDir = path.join(baseDir, ".agent-profiler");
    fs.mkdirSync(profilerDir, { recursive: true });
    const logPath = path.join(profilerDir, "opencode-plugin.log");
    const line = `${new Date().toISOString()} ${message}\n`;
    fs.appendFileSync(logPath, line, "utf8");
  } catch {
    // Keep plugin resilient; telemetry must not crash OpenCode sessions.
  }
}

/**
 * OpenCode plugin entrypoint. Captures core telemetry lifecycle events
 * and forwards them to agent-profiler hook ingestion.
 */
export const AgentProfilerTelemetryPlugin = async ({ project }) => {
  let projectDirectory = pick(project, ["directory", "worktree", "cwd"]);
  const repoPathBySession = new Map();
  return {
    event: async ({ event }) => {
      if (!projectDirectory) {
        projectDirectory = pick(event, ["directory", "worktree", "cwd"]);
      }
      const mappedEventType = mapEventType(event);
      if (mappedEventType === "unknown.event") {
        writeDebugLog(
          projectDirectory,
          `ignored unknown event shape keys=${Object.keys(event ?? {}).join(",")}`,
        );
        return;
      }

      if (!shouldForwardEvent(mappedEventType)) {
        writeDebugLog(
          projectDirectory,
          `ignored noisy event=${mappedEventType}`,
        );
        return;
      }

      const sessionId = readSessionId(event);
      const resolvedRepoPath =
        resolveRepoPath(projectDirectory, event) ??
        (sessionId ? repoPathBySession.get(sessionId) : undefined);
      if (sessionId && resolvedRepoPath) {
        repoPathBySession.set(sessionId, resolvedRepoPath);
      }

      const payload = {
        ...event,
        opencode_event: mappedEventType,
        opencode_version:
          pick(event, ["app_version", "version"]) ??
          pick(project, ["version"]) ??
          "unknown",
        opencode_project_name: pick(project, ["name"]),
        repo_path: resolvedRepoPath,
        session_id: sessionId,
      };

      writeDebugLog(projectDirectory, `observed event=${mappedEventType}`);
      runProfilerHook(projectDirectory, mappedEventType, payload);
    },
  };
};
