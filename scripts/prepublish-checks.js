import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const packageJsonPath = path.join(repoRoot, "package.json");
const readmePath = path.join(repoRoot, "README.md");
const distCliPath = path.join(repoRoot, "dist", "cli.js");
const distSchemaPath = path.join(repoRoot, "dist", "core", "schema.sql");

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const failures = [];

function fail(message) {
  failures.push(message);
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function assertRequiredMetadata() {
  if (packageJson.name !== "agent-profiler") {
    fail(
      `package name must be \`agent-profiler\`, got ${JSON.stringify(packageJson.name)}`,
    );
  }

  if (packageJson.version !== "0.0.0-semantically-released") {
    fail("package version must stay on the semantic-release placeholder");
  }

  if (packageJson.license !== "MIT") {
    fail("package license must be set to MIT");
  }

  if (packageJson.bin?.["agent-profiler"] !== "./dist/cli.js") {
    fail("package bin must point at ./dist/cli.js");
  }

  if (packageJson.publishConfig?.access !== "public") {
    fail("publishConfig.access must be public");
  }

  if (packageJson.publishConfig?.provenance !== true) {
    fail("publishConfig.provenance must be true");
  }

  if (
    !packageJson.repository?.url?.includes("github.com/cleverb/agent-profiler")
  ) {
    fail("repository.url must point at github.com/cleverb/agent-profiler");
  }

  if (!packageJson.homepage?.includes("github.com/cleverb/agent-profiler")) {
    fail("homepage must point at the GitHub repository");
  }

  if (
    !packageJson.bugs?.url?.includes("github.com/cleverb/agent-profiler/issues")
  ) {
    fail("bugs.url must point at the GitHub issues page");
  }
}

function assertReadme() {
  if (!fs.existsSync(readmePath)) {
    fail("README.md is required for package consumers");
    return;
  }

  const readme = fs.readFileSync(readmePath, "utf8");

  if (!readme.includes("npx agent-profiler")) {
    fail("README.md must document one-off npx usage");
  }

  if (!readme.includes("npm install -g agent-profiler")) {
    fail("README.md must document the global install path for prod hooks");
  }
}

function assertBuildArtifacts() {
  if (!fs.existsSync(distCliPath)) {
    fail("missing build artifact: dist/cli.js");
  }

  if (!fs.existsSync(distSchemaPath)) {
    fail("missing runtime asset: dist/core/schema.sql");
  }
}

function assertPacklist() {
  const raw = execFileSync(
    npmCommand(),
    ["pack", "--dry-run", "--json", "--silent"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        HUSKY: "0",
        npm_config_ignore_scripts: "true",
      },
    },
  );

  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    fail("could not parse `npm pack --dry-run --json` output");
    return;
  }

  const packResult = JSON.parse(raw.slice(start, end + 1));
  const files = Array.isArray(packResult?.[0]?.files)
    ? packResult[0].files
    : [];
  const unexpected = files
    .map((file) => file.path)
    .filter(
      (filePath) =>
        filePath !== "package.json" &&
        filePath !== "README.md" &&
        filePath !== "LICENSE" &&
        !filePath.startsWith("dist/"),
    );

  if (unexpected.length > 0) {
    fail(`npm pack includes unexpected files: ${unexpected.join(", ")}`);
  }
}

assertRequiredMetadata();
assertReadme();
assertBuildArtifacts();
assertPacklist();

if (failures.length > 0) {
  console.error("Prepublish checks failed:");
  for (const message of failures) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log("Prepublish checks passed.");
