import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

type DerivedHomePath = {
  homeRelPath: string | null;
  displayPath: string | null;
};

export type WorkspaceGitMeta = {
  /** Absolute working directory for this hook (session / payload cwd). */
  workspacePath: string;
  /** Slash-separated path relative to the user's home directory, else null. */
  workspaceHomeRelPath: string | null;
  /** Display-only home-relative path (for example `~/repo`) when applicable. */
  workspaceDisplayPath: string | null;
  /** `git rev-parse --show-toplevel` when inside a repo, else null. */
  gitRepoRoot: string | null;
  /** Slash-separated repo-root path relative to the user's home directory, else null. */
  gitRepoRootHomeRelPath: string | null;
  /** Display-only repo-root path (for example `~/repo`) when applicable. */
  gitRepoRootDisplayPath: string | null;
  /** Short label: basename of repo root (and git present); else null. */
  gitRepoName: string | null;
  /** `git rev-parse --abbrev-ref HEAD` (may be `HEAD` when detached); null if not a git repo. */
  gitBranch: string | null;
};

function trimmedOrNull(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toSlashPath(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

function deriveHomePath(absolutePath: string | null): DerivedHomePath {
  if (!absolutePath) {
    return { homeRelPath: null, displayPath: null };
  }

  const homeDir = trimmedOrNull(os.homedir());
  if (!homeDir) {
    return { homeRelPath: null, displayPath: null };
  }

  const normalizedHome = path.normalize(homeDir);
  const normalizedPath = path.normalize(absolutePath);
  const relativePath = path.relative(normalizedHome, normalizedPath);

  if (!relativePath) {
    return { homeRelPath: ".", displayPath: "~" };
  }

  if (path.isAbsolute(relativePath)) {
    return { homeRelPath: null, displayPath: null };
  }

  if (relativePath === ".." || relativePath.startsWith(`..${path.sep}`)) {
    return { homeRelPath: null, displayPath: null };
  }

  const slashPath = toSlashPath(relativePath);
  return {
    homeRelPath: slashPath,
    displayPath: `~/${slashPath}`,
  };
}

/**
 * Absolute path for “where this event ran”: adapter repoPath, then common payload cwd keys, then process.cwd().
 */
export function resolveHookWorkspacePath(
  normalizedRepoPath: string | undefined,
  rawPayload: unknown,
): string {
  const payload = asRecord(rawPayload);
  const candidates = [
    trimmedOrNull(normalizedRepoPath),
    trimmedOrNull(payload.cwd),
    trimmedOrNull(payload.workspacePath),
    trimmedOrNull(payload.workspace),
    trimmedOrNull(payload.projectPath),
    trimmedOrNull(payload.rootPath),
  ];
  for (const c of candidates) {
    if (!c) continue;
    return path.isAbsolute(c)
      ? path.normalize(c)
      : path.resolve(process.cwd(), c);
  }
  return path.resolve(process.cwd());
}

function gitOutput(workspacePath: string, args: string[]): string | null {
  try {
    const r = spawnSync("git", ["-C", workspacePath, ...args], {
      encoding: "utf8",
      timeout: 2500,
      maxBuffer: 2 * 1024 * 1024,
    });
    if (r.error || r.status !== 0) return null;
    const out = (r.stdout ?? "").trim();
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * Best-effort git context for `workspacePath`. Non-repo → git* fields null; `workspacePath` still set.
 */
export function resolveWorkspaceGitMeta(
  workspacePath: string,
): WorkspaceGitMeta {
  const normalizedWorkspacePath = path.normalize(workspacePath);
  const workspaceHomePath = deriveHomePath(normalizedWorkspacePath);
  const inside = gitOutput(normalizedWorkspacePath, [
    "rev-parse",
    "--is-inside-work-tree",
  ]);
  if (inside !== "true") {
    return {
      workspacePath: normalizedWorkspacePath,
      workspaceHomeRelPath: workspaceHomePath.homeRelPath,
      workspaceDisplayPath: workspaceHomePath.displayPath,
      gitRepoRoot: null,
      gitRepoRootHomeRelPath: null,
      gitRepoRootDisplayPath: null,
      gitRepoName: null,
      gitBranch: null,
    };
  }

  const root = gitOutput(normalizedWorkspacePath, [
    "rev-parse",
    "--show-toplevel",
  ]);
  const branch = gitOutput(normalizedWorkspacePath, [
    "rev-parse",
    "--abbrev-ref",
    "HEAD",
  ]);

  const gitRepoRoot = root ? path.normalize(root) : null;
  const gitRepoRootHomePath = deriveHomePath(gitRepoRoot);
  const gitRepoName = gitRepoRoot ? path.basename(gitRepoRoot) : null;

  return {
    workspacePath: normalizedWorkspacePath,
    workspaceHomeRelPath: workspaceHomePath.homeRelPath,
    workspaceDisplayPath: workspaceHomePath.displayPath,
    gitRepoRoot,
    gitRepoRootHomeRelPath: gitRepoRootHomePath.homeRelPath,
    gitRepoRootDisplayPath: gitRepoRootHomePath.displayPath,
    gitRepoName,
    gitBranch: branch,
  };
}
