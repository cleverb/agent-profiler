import path from "node:path";
import { spawnSync } from "node:child_process";

export type WorkspaceGitMeta = {
  /** Absolute working directory for this hook (session / payload cwd). */
  workspacePath: string;
  /** `git rev-parse --show-toplevel` when inside a repo, else null. */
  gitRepoRoot: string | null;
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
    return path.isAbsolute(c) ? path.normalize(c) : path.resolve(process.cwd(), c);
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
export function resolveWorkspaceGitMeta(workspacePath: string): WorkspaceGitMeta {
  const inside = gitOutput(workspacePath, ["rev-parse", "--is-inside-work-tree"]);
  if (inside !== "true") {
    return {
      workspacePath,
      gitRepoRoot: null,
      gitRepoName: null,
      gitBranch: null,
    };
  }

  const root = gitOutput(workspacePath, ["rev-parse", "--show-toplevel"]);
  const branch = gitOutput(workspacePath, ["rev-parse", "--abbrev-ref", "HEAD"]);

  const gitRepoRoot = root ? path.normalize(root) : null;
  const gitRepoName = gitRepoRoot ? path.basename(gitRepoRoot) : null;

  return {
    workspacePath,
    gitRepoRoot,
    gitRepoName,
    gitBranch: branch,
  };
}
