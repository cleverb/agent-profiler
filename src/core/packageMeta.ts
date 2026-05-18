import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type PackageMeta = {
  version?: string;
};

let cachedPackageMeta: PackageMeta | null = null;

function readPackageMeta(): PackageMeta {
  if (cachedPackageMeta) return cachedPackageMeta;

  const packageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
  );
  const packageJsonPath = path.join(packageRoot, "package.json");

  try {
    cachedPackageMeta = JSON.parse(
      fs.readFileSync(packageJsonPath, "utf8"),
    ) as PackageMeta;
  } catch {
    cachedPackageMeta = {};
  }

  return cachedPackageMeta;
}

export function getPackageVersion(): string {
  return readPackageMeta().version ?? "0.0.0";
}

export function getIngestVersion(): string {
  const fromEnv = process.env.AGENT_PROFILER_DEV_VERSION?.trim();
  if (fromEnv) return fromEnv;
  const pkg = getPackageVersion();
  if (!pkg || pkg === "0.0.0") return "dev";
  return pkg;
}
