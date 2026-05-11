import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type AgentProfilerConfig = {
  databasePath?: string;
};

function readJsonFile<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

export function getLocalProfileDir(cwd = process.cwd()): string {
  return path.join(cwd, ".agent-profiler");
}

export function getHomeProfileDir(): string {
  return path.join(os.homedir(), ".agent-profiler");
}

export function getPreferredConfigPath(cwd = process.cwd()): string {
  const localConfig = path.join(getLocalProfileDir(cwd), "config.json");
  if (fs.existsSync(localConfig)) return localConfig;
  return path.join(getHomeProfileDir(), "config.json");
}

export function getConfiguredDatabasePath(cwd = process.cwd()): string | null {
  const configPath = getPreferredConfigPath(cwd);
  const config = readJsonFile<AgentProfilerConfig>(configPath);
  return config?.databasePath ?? null;
}
