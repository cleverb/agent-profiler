import fs from "node:fs";
import path from "node:path";
import { estimateTokens } from "./tokens.js";

export type ContextFileEstimate = {
  path: string;
  estimatedTokens: number;
};

export type ContextAuditResult = {
  totalEstimatedTokens: number;
  files: ContextFileEstimate[];
};

const EXACT_FILES = [
  "AGENTS.md",
  "CLAUDE.md",
  ".cursorrules",
  ".codex/config.toml",
  ".codex/hooks.json",
  ".claude/settings.json",
];

const DIRS = [
  ".cursor/rules",
  ".cursor/skills",
  ".claude/commands",
  ".claude/agents",
  ".claude/skills",
];

function readTextFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function walkFiles(dirPath: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dirPath)) return out;

  const stack = [dirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        out.push(fullPath);
      }
    }
  }

  return out;
}

export function runContextAudit(rootDir = process.cwd()): ContextAuditResult {
  const candidates = new Set<string>();

  for (const relativePath of EXACT_FILES) {
    const fullPath = path.join(rootDir, relativePath);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      candidates.add(fullPath);
    }
  }

  for (const relativeDir of DIRS) {
    const fullDir = path.join(rootDir, relativeDir);
    for (const filePath of walkFiles(fullDir)) {
      candidates.add(filePath);
    }
  }

  const files: ContextFileEstimate[] = [];
  for (const fullPath of candidates) {
    const text = readTextFile(fullPath);
    const estimatedTokens = estimateTokens(text);
    if (estimatedTokens > 0) {
      files.push({
        path: path.relative(rootDir, fullPath) || fullPath,
        estimatedTokens,
      });
    }
  }

  files.sort((a, b) => b.estimatedTokens - a.estimatedTokens);
  const totalEstimatedTokens = files.reduce((sum, file) => sum + file.estimatedTokens, 0);

  return { totalEstimatedTokens, files };
}
