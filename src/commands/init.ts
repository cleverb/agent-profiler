import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openDb, resolveUsableDbPath } from "../core/db.js";
import { getHomeProfileDir, getLocalProfileDir } from "../core/profile.js";

const GITIGNORE_MARKER = "# Agent Profiler local store";
const GITIGNORE_ENTRY = ".agent-profiler/";

function ensureProfilerGitignore(projectRoot: string): void {
  const gitignorePath = path.join(projectRoot, ".gitignore");
  const block = `${GITIGNORE_MARKER}\n${GITIGNORE_ENTRY}\n`;

  let existing = "";
  try {
    existing = fs.readFileSync(gitignorePath, "utf8");
  } catch {
    fs.writeFileSync(gitignorePath, block, "utf8");
    return;
  }

  const lines = existing.split(/\r?\n/);
  const hasEntry = lines.some(
    (line) =>
      line.trim() === GITIGNORE_ENTRY || line.trim() === ".agent-profiler",
  );
  if (hasEntry) return;

  const suffix = existing.endsWith("\n") || existing.length === 0 ? "" : "\n";
  fs.appendFileSync(gitignorePath, `${suffix}\n${block}`, "utf8");
}

export type InitSource = "cursor" | "codex" | "claude";

type CursorAdapterConfig = {
  enabled: boolean;
  hookFile: string;
  mode: "dev" | "prod";
  initializedAt: string;
};

type AgentProfilerConfig = {
  adapters: Partial<{
    cursor: CursorAdapterConfig;
    codex: CursorAdapterConfig;
    claude: CursorAdapterConfig;
  }>;
  databasePath: string;
  updatedAt: string;
};

type CursorHookCommand = { command: string };

type CursorIdeHooksConfig = {
  version?: number;
  hooks?: Record<string, string | CursorHookCommand[]>;
};

type CodexHookHandler = { type?: string; command?: string; timeout?: number };
type CodexHookGroup = { matcher?: string; hooks?: CodexHookHandler[] };
type CodexHooksFile = { hooks?: Record<string, CodexHookGroup[]> };
type ClaudeHooksSettings = { hooks?: Record<string, CodexHookGroup[]> };

const CURSOR_EVENTS = [
  "beforeSubmitPrompt",
  "afterAgentResponse",
  "afterAgentThought",
  "preToolUse",
  "postToolUse",
  "postToolUseFailure",
  "beforeMCPExecution",
  "afterMCPExecution",
  "beforeShellExecution",
  "afterShellExecution",
  "beforeReadFile",
  "afterFileEdit",
  "stop",
] as const;

const CODEX_EVENTS = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "Stop",
] as const;

const CLAUDE_EVENTS = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "Stop",
] as const;

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getProfilerDir(): string {
  const localDir = getLocalProfileDir(process.cwd());
  try {
    ensureDir(localDir);
    return localDir;
  } catch {
    const homeDir = getHomeProfileDir();
    ensureDir(homeDir);
    return homeDir;
  }
}

function getProfilerDirByMode(mode: "dev" | "prod"): string {
  if (mode === "prod") {
    const homeDir = getHomeProfileDir();
    ensureDir(homeDir);
    return homeDir;
  }
  return getProfilerDir();
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJsonFile(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function resolveCursorHookFile(): string {
  const localCursorDir = path.join(process.cwd(), ".cursor");
  try {
    ensureDir(localCursorDir);
    return path.join(localCursorDir, "hooks.json");
  } catch {
    const homeBase = process.env.HOME ?? process.cwd();
    const homeCursorDir = path.join(homeBase, ".cursor");
    ensureDir(homeCursorDir);
    return path.join(homeCursorDir, "hooks.json");
  }
}

function resolveCodexDir(): string {
  const local = path.join(process.cwd(), ".codex");
  ensureDir(local);
  return local;
}

function resolveClaudeDir(): string {
  const local = path.join(process.cwd(), ".claude");
  ensureDir(local);
  return local;
}

function packagedCliJsPath(): string {
  const packageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
  );
  return path.join(packageRoot, "dist", "cli.js");
}

function hookCommand(
  mode: "dev" | "prod",
  source: InitSource,
  eventName: string,
): string {
  const cliPath = packagedCliJsPath();
  return mode === "dev"
    ? `node ${cliPath} hook ${source} ${eventName}`
    : `agent-profiler hook ${source} ${eventName}`;
}

function updateCursorIdeHooks(hooksFile: string, mode: "dev" | "prod"): void {
  const existing = readJsonFile<CursorIdeHooksConfig>(hooksFile) ?? {};
  const hooks: Record<string, string | CursorHookCommand[]> = {
    ...(existing.hooks ?? {}),
  };
  for (const eventName of CURSOR_EVENTS) {
    hooks[eventName] = [{ command: hookCommand(mode, "cursor", eventName) }];
  }
  const updated: CursorIdeHooksConfig = { ...existing, version: 1, hooks };
  writeJsonFile(hooksFile, updated);
}

function profilerMarkerSubcommand(
  source: InitSource,
  eventName: string,
): string {
  return `hook ${source} ${eventName}`;
}

function codexGroupHasProfilerCommand(
  groups: CodexHookGroup[] | undefined,
  marker: string,
): boolean {
  if (!groups) return false;
  for (const g of groups) {
    for (const h of g.hooks ?? []) {
      if (typeof h.command === "string" && h.command.includes(marker))
        return true;
    }
  }
  return false;
}

function mergeCodexProfilerHooks(
  hooksFile: string,
  mode: "dev" | "prod",
): void {
  const existingRaw = readJsonFile<unknown>(hooksFile);
  const file: CodexHooksFile =
    existingRaw &&
    typeof existingRaw === "object" &&
    !Array.isArray(existingRaw) &&
    "hooks" in (existingRaw as object)
      ? (existingRaw as CodexHooksFile)
      : { hooks: {} };

  file.hooks = { ...(file.hooks ?? {}) };

  for (const eventName of CODEX_EVENTS) {
    const marker = profilerMarkerSubcommand("codex", eventName);
    const groups = [...(file.hooks[eventName] ?? [])];
    if (codexGroupHasProfilerCommand(groups, marker)) {
      file.hooks[eventName] = groups;
      continue;
    }
    const command = hookCommand(mode, "codex", eventName);
    const needsMatcher =
      eventName === "SessionStart" ||
      eventName === "PreToolUse" ||
      eventName === "PostToolUse";
    const group: CodexHookGroup = {
      ...(needsMatcher ? { matcher: "*" } : {}),
      hooks: [{ type: "command", command }],
    };
    groups.push(group);
    file.hooks[eventName] = groups;
  }

  writeJsonFile(hooksFile, file);
}

function mergeClaudeProfilerHooks(
  settingsFile: string,
  mode: "dev" | "prod",
): void {
  const existingRaw = readJsonFile<unknown>(settingsFile);
  const file: ClaudeHooksSettings =
    existingRaw &&
    typeof existingRaw === "object" &&
    !Array.isArray(existingRaw) &&
    "hooks" in (existingRaw as object)
      ? (existingRaw as ClaudeHooksSettings)
      : { hooks: {} };

  file.hooks = { ...(file.hooks ?? {}) };

  for (const eventName of CLAUDE_EVENTS) {
    const marker = profilerMarkerSubcommand("claude", eventName);
    const groups = [...(file.hooks[eventName] ?? [])];
    if (codexGroupHasProfilerCommand(groups, marker)) {
      file.hooks[eventName] = groups;
      continue;
    }
    const command = hookCommand(mode, "claude", eventName);
    const needsMatcher =
      eventName === "SessionStart" ||
      eventName === "PreToolUse" ||
      eventName === "PostToolUse" ||
      eventName === "PostToolUseFailure";
    const group: CodexHookGroup = {
      ...(needsMatcher ? { matcher: "*" } : {}),
      hooks: [{ type: "command", command }],
    };
    groups.push(group);
    file.hooks[eventName] = groups;
  }

  writeJsonFile(settingsFile, file);
}

function ensureCodexHooksFeatureFlag(codexDir: string): void {
  const configPath = path.join(codexDir, "config.toml");
  let raw = "";
  try {
    raw = fs.readFileSync(configPath, "utf8");
  } catch {
    raw = "";
  }

  if (!raw.trim()) {
    fs.writeFileSync(configPath, `[features]\ncodex_hooks = true\n`, "utf8");
    return;
  }

  if (/\bcodex_hooks\s*=\s*false\b/.test(raw)) {
    raw = raw.replace(/\bcodex_hooks\s*=\s*false\b/, "codex_hooks = true");
    fs.writeFileSync(configPath, raw, "utf8");
    return;
  }

  if (/\bcodex_hooks\s*=\s*true\b/.test(raw)) {
    return;
  }

  fs.writeFileSync(
    configPath,
    `${raw.trimEnd()}\n\n[features]\ncodex_hooks = true\n`,
    "utf8",
  );
}

function writeProfilerConfigMerged(
  configPath: string,
  adapterKey: keyof NonNullable<AgentProfilerConfig["adapters"]>,
  adapterConfig: CursorAdapterConfig,
  dbPath: string,
): void {
  const previous = readJsonFile<AgentProfilerConfig>(configPath);
  const now = new Date().toISOString();
  const priorInit = previous?.adapters?.[adapterKey]?.initializedAt;
  const merged: CursorAdapterConfig = {
    ...adapterConfig,
    initializedAt: priorInit && priorInit.length > 0 ? priorInit : now,
  };

  const updated: AgentProfilerConfig = {
    adapters: {
      ...previous?.adapters,
      [adapterKey]: merged,
    },
    databasePath: dbPath,
    updatedAt: now,
  };

  writeJsonFile(configPath, updated);
}

export function runInit(
  source: InitSource,
  mode: "dev" | "prod" = "dev",
): void {
  const profilerDir = getProfilerDirByMode(mode);
  ensureDir(profilerDir);

  const configuredDbPath = path.join(profilerDir, "events.sqlite");
  const resolvedDbPath = resolveUsableDbPath(configuredDbPath);

  const db = openDb(resolvedDbPath);
  db.close();

  if (mode === "dev") {
    const localProfiler = path.resolve(getLocalProfileDir(process.cwd()));
    if (path.resolve(profilerDir) === localProfiler) {
      ensureProfilerGitignore(process.cwd());
    }
  }

  let hooksPath = "";
  let configPath = path.join(profilerDir, "config.json");
  let usedFallbackConfigPath = false;

  if (source === "cursor") {
    hooksPath = resolveCursorHookFile();
    updateCursorIdeHooks(hooksPath, mode);
    try {
      writeProfilerConfigMerged(
        configPath,
        "cursor",
        {
          enabled: true,
          hookFile: hooksPath,
          mode,
          initializedAt: "",
        },
        resolvedDbPath,
      );
    } catch {
      const localConfigDir = getLocalProfileDir(process.cwd());
      ensureDir(localConfigDir);
      configPath = path.join(localConfigDir, "config.json");
      writeProfilerConfigMerged(
        configPath,
        "cursor",
        {
          enabled: true,
          hookFile: hooksPath,
          mode,
          initializedAt: "",
        },
        resolvedDbPath,
      );
      usedFallbackConfigPath = true;
    }

    console.log("Agent Profiler initialized for Cursor.");
  } else if (source === "codex") {
    const codexDir = resolveCodexDir();
    ensureCodexHooksFeatureFlag(codexDir);
    hooksPath = path.join(codexDir, "hooks.json");
    mergeCodexProfilerHooks(hooksPath, mode);
    try {
      writeProfilerConfigMerged(
        configPath,
        "codex",
        {
          enabled: true,
          hookFile: hooksPath,
          mode,
          initializedAt: "",
        },
        resolvedDbPath,
      );
    } catch {
      const localConfigDir = getLocalProfileDir(process.cwd());
      ensureDir(localConfigDir);
      configPath = path.join(localConfigDir, "config.json");
      writeProfilerConfigMerged(
        configPath,
        "codex",
        {
          enabled: true,
          hookFile: hooksPath,
          mode,
          initializedAt: "",
        },
        resolvedDbPath,
      );
      usedFallbackConfigPath = true;
    }

    console.log("Agent Profiler initialized for Codex.");
    console.log(
      "Note:     Enable hooks in Codex if prompted; project .codex/ must be trusted.",
    );
  } else {
    const claudeDir = resolveClaudeDir();
    hooksPath = path.join(claudeDir, "settings.json");
    mergeClaudeProfilerHooks(hooksPath, mode);
    try {
      writeProfilerConfigMerged(
        configPath,
        "claude",
        {
          enabled: true,
          hookFile: hooksPath,
          mode,
          initializedAt: "",
        },
        resolvedDbPath,
      );
    } catch {
      const localConfigDir = getLocalProfileDir(process.cwd());
      ensureDir(localConfigDir);
      configPath = path.join(localConfigDir, "config.json");
      writeProfilerConfigMerged(
        configPath,
        "claude",
        {
          enabled: true,
          hookFile: hooksPath,
          mode,
          initializedAt: "",
        },
        resolvedDbPath,
      );
      usedFallbackConfigPath = true;
    }

    console.log("Agent Profiler initialized for Claude.");
    console.log(
      "Note:     Review .claude/settings.json hooks and restart Claude Code if needed.",
    );
  }

  console.log(`Mode:     ${mode}`);
  console.log(`Config:   ${configPath}`);
  console.log(`Database: ${resolvedDbPath}`);
  console.log(`Hooks:    ${hooksPath}`);
  if (mode === "prod") {
    console.log(
      "Note:     Prod mode requires a real `agent-profiler` install on PATH.",
    );
    console.log(
      "          Use `npx agent-profiler ...` for one-off commands only.",
    );
  }
  if (usedFallbackConfigPath) {
    console.log(
      "Note:     Could not write home config in this environment; wrote local config instead.",
    );
  }
}
