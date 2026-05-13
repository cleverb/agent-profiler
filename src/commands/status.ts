import fs from "node:fs";
import path from "node:path";
import {
  getDefaultDbPath,
  getLastEventSummary,
  openDb,
  resolveUsableDbPath,
} from "../core/db.js";
import { getPreferredConfigPath } from "../core/profile.js";

type AgentProfilerConfig = {
  adapters?: {
    cursor?: {
      enabled?: boolean;
      hookFile?: string;
      mode?: "dev" | "prod";
    };
    codex?: {
      enabled?: boolean;
      hookFile?: string;
      mode?: "dev" | "prod";
    };
  };
  databasePath?: string;
};

type CursorHookCommand = { command?: string };

type CursorHooksConfig = {
  hooks?: Record<string, string | CursorHookCommand[]>;
};

function hookEntryCommand(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value) || value.length === 0) return "";
  const first = value[0];
  if (first && typeof first === "object" && typeof first.command === "string") {
    return first.command;
  }
  return "";
}

function hookConfigured(hooks: Record<string, string | CursorHookCommand[]>, eventName: string): boolean {
  return hookEntryCommand(hooks[eventName]).trim().length > 0;
}

const REQUIRED_CURSOR_EVENTS = [
  "beforeSubmitPrompt",
  "afterAgentResponse",
  "afterShellExecution",
  "afterFileEdit",
  "stop",
  "preToolUse",
  "postToolUse",
  "postToolUseFailure",
  "beforeMCPExecution",
  "afterMCPExecution",
];

const REQUIRED_CODEX_EVENTS = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "Stop",
];

type CodexHookHandler = { command?: string };
type CodexHookGroup = { hooks?: CodexHookHandler[] };
type CodexHooksFile = { hooks?: Record<string, CodexHookGroup[]> };

function codexEventConfigured(
  hooks: Record<string, CodexHookGroup[]>,
  eventName: string,
  marker: string,
): boolean {
  const groups = hooks[eventName] ?? [];
  for (const g of groups) {
    for (const h of g.hooks ?? []) {
      if (typeof h.command === "string" && h.command.includes(marker)) return true;
    }
  }
  return false;
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function getProfilerConfigPath(resolvedDbPath: string): string {
  return path.join(path.dirname(resolvedDbPath), "config.json");
}

function resolveStatusPaths(mode: "dev" | "prod"): {
  configuredDbPath: string;
  resolvedDbPath: string;
  configPath: string;
} {
  const preferredConfigPath =
    mode === "prod"
      ? path.join(process.env.HOME ?? "", ".agent-profiler", "config.json")
      : getPreferredConfigPath(process.cwd());
  const config = readJsonFile<AgentProfilerConfig>(preferredConfigPath);

  if (config?.databasePath) {
    const resolvedFromConfig = resolveUsableDbPath(config.databasePath);
    return {
      configuredDbPath: config.databasePath,
      resolvedDbPath: resolvedFromConfig,
      configPath: preferredConfigPath,
    };
  }

  const defaultDbPath = resolveUsableDbPath(getDefaultDbPath());
  const defaultConfigPath = getProfilerConfigPath(defaultDbPath);
  return {
    configuredDbPath: getDefaultDbPath(),
    resolvedDbPath: defaultDbPath,
    configPath: defaultConfigPath,
  };
}

function commandExistsInPath(command: string): boolean {
  const pathValue = process.env.PATH ?? "";
  for (const dir of pathValue.split(path.delimiter)) {
    if (!dir) continue;
    const fullPath = path.join(dir, command);
    if (fs.existsSync(fullPath)) return true;
  }
  return false;
}

function getCursorSetupStatus(
  configPath: string,
  mode: "dev" | "prod",
): { state: string; note: string } {
  const config = readJsonFile<AgentProfilerConfig>(configPath);
  const cursor = config?.adapters?.cursor;
  if (!cursor?.enabled || !cursor.hookFile) {
    return { state: "not yet", note: "run `agent-profiler init cursor`" };
  }

  const hooks = readJsonFile<CursorHooksConfig>(cursor.hookFile)?.hooks ?? {};
  const missing = REQUIRED_CURSOR_EVENTS.filter((eventName) => !hookConfigured(hooks, eventName));

  if (missing.length > 0) {
    return {
      state: "partial",
      note: `missing hooks: ${missing.join(", ")}`,
    };
  }

  const sampleCommand = hookEntryCommand(hooks.beforeSubmitPrompt);
  if (mode === "dev") {
    if (!sampleCommand.startsWith("node ")) {
      return { state: "partial", note: "dev mode expects hooks to use `node <abs>/dist/cli.js ...`" };
    }
    const cliPath = sampleCommand.split(" ")[1];
    if (!cliPath || !fs.existsSync(cliPath)) {
      return { state: "partial", note: "dev hook CLI path is missing or invalid" };
    }
  } else {
    if (!sampleCommand.startsWith("agent-profiler ")) {
      return { state: "partial", note: "prod mode expects hooks to use `agent-profiler ...`" };
    }
    if (!commandExistsInPath("agent-profiler")) {
      return { state: "partial", note: "`agent-profiler` is not on PATH" };
    }
  }

  return { state: "yes", note: "configured via init" };
}

function getCodexSetupStatus(
  configPath: string,
  mode: "dev" | "prod",
): { state: string; note: string } {
  const config = readJsonFile<AgentProfilerConfig>(configPath);
  const codex = config?.adapters?.codex;
  if (!codex?.enabled || !codex.hookFile) {
    return { state: "not yet", note: "run `agent-profiler init codex`" };
  }

  const data = readJsonFile<CodexHooksFile>(codex.hookFile);
  const hooks = data?.hooks ?? {};
  const missing = REQUIRED_CODEX_EVENTS.filter(
    (eventName) =>
      !codexEventConfigured(hooks, eventName, `hook codex ${eventName}`),
  );

  if (missing.length > 0) {
    return {
      state: "partial",
      note: `missing hooks: ${missing.join(", ")}`,
    };
  }

  const userPromptGroups = hooks.UserPromptSubmit ?? [];
  let sampleCommand = "";
  outer: for (const g of userPromptGroups) {
    for (const h of g.hooks ?? []) {
      if (typeof h.command === "string" && h.command.includes("hook codex")) {
        sampleCommand = h.command;
        break outer;
      }
    }
  }

  if (!sampleCommand) {
    return { state: "partial", note: "could not find agent-profiler command in Codex hooks" };
  }

  if (mode === "dev") {
    if (!sampleCommand.startsWith("node ")) {
      return { state: "partial", note: "dev mode expects hooks to use `node <abs>/dist/cli.js ...`" };
    }
    const cliPath = sampleCommand.split(" ")[1];
    if (!cliPath || !fs.existsSync(cliPath)) {
      return { state: "partial", note: "dev hook CLI path is missing or invalid" };
    }
  } else {
    if (!sampleCommand.startsWith("agent-profiler ")) {
      return { state: "partial", note: "prod mode expects hooks to use `agent-profiler ...`" };
    }
    if (!commandExistsInPath("agent-profiler")) {
      return { state: "partial", note: "`agent-profiler` is not on PATH" };
    }
  }

  return { state: "yes", note: "configured via init" };
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export type StatusReport = {
  mode: "dev" | "prod";
  databasePath: string;
  adapters: {
    cursor: {
      state: string;
      setup: string;
    };
    codex: {
      state: string;
      setup: string;
    };
  };
  lastEvent:
    | {
        createdAt: string;
        source: string;
        event: string;
        estimatedTokens: number;
      }
    | null;
  dashboard: "not running";
};

export function getStatusReport(mode: "dev" | "prod" = "dev"): StatusReport {
  const { configuredDbPath, resolvedDbPath, configPath } = resolveStatusPaths(mode);
  const cursorSetup = getCursorSetupStatus(configPath, mode);
  const codexSetup = getCodexSetupStatus(configPath, mode);

  let lastEvent = null;
  try {
    const db = openDb(configuredDbPath);
    try {
      lastEvent = getLastEventSummary(db);
    } finally {
      db.close();
    }
  } catch {
    lastEvent = null;
  }

  return {
    mode,
    databasePath: resolvedDbPath,
    adapters: {
      cursor: {
        state: cursorSetup.state,
        setup: cursorSetup.note,
      },
      codex: {
        state: codexSetup.state,
        setup: codexSetup.note,
      },
    },
    lastEvent: lastEvent
      ? {
          createdAt: lastEvent.createdAt,
          source: lastEvent.source,
          event: lastEvent.sourceEvent,
          estimatedTokens: lastEvent.estimatedTotalTokens,
        }
      : null,
    dashboard: "not running",
  };
}

export function runStatus(mode: "dev" | "prod" = "dev"): void {
  const report = getStatusReport(mode);

  const lines: string[] = [];
  lines.push("Agent Profiler Status");
  lines.push("");
  lines.push("Mode:");
  lines.push(`  ${report.mode}`);
  lines.push("");
  lines.push("Database:");
  lines.push(`  ${report.databasePath}`);
  lines.push("");
  lines.push("Configured adapters:");
  lines.push(`  Cursor: ${report.adapters.cursor.state}`);
  lines.push(`  setup: ${report.adapters.cursor.setup}`);
  lines.push(`  Codex: ${report.adapters.codex.state}`);
  lines.push(`  setup: ${report.adapters.codex.setup}`);
  lines.push("");
  lines.push("Last event:");
  if (report.lastEvent) {
    lines.push(`  ${formatTimestamp(report.lastEvent.createdAt)}`);
    lines.push(`  source: ${report.lastEvent.source}`);
    lines.push(`  event: ${report.lastEvent.event}`);
    lines.push(`  estimated tokens: ${formatCount(report.lastEvent.estimatedTokens)}`);
  } else {
    lines.push("  none yet");
  }
  lines.push("");
  lines.push("Dashboard:");
  lines.push("  not running");

  console.log(lines.join("\n"));
}
