import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

fs.copyFileSync(
  path.join(root, "src/core/schema.sql"),
  path.join(root, "dist/core/schema.sql"),
);

const dashboardPublic = path.join(root, "packages/dashboard/public");
const dashboardBundle = path.join(root, "packages/dashboard/dist/app.iife.js");

if (!fs.existsSync(dashboardBundle)) {
  throw new Error(
    "Missing dashboard bundle; run `npm run build --workspace=@agent-profiler/dashboard` first.",
  );
}

fs.mkdirSync(path.join(root, "dist/dashboard"), { recursive: true });
fs.cpSync(dashboardPublic, path.join(root, "dist/dashboard"), {
  recursive: true,
});
fs.copyFileSync(dashboardBundle, path.join(root, "dist/dashboard/app.js"));

const picoSrc = path.join(
  root,
  "node_modules",
  "@picocss",
  "pico",
  "css",
  "pico.min.css",
);
if (!fs.existsSync(picoSrc)) {
  throw new Error("Missing @picocss/pico; run `npm install` before build.");
}
fs.copyFileSync(picoSrc, path.join(root, "dist/dashboard/pico.min.css"));

try {
  fs.chmodSync(path.join(root, "dist/cli.js"), 0o755);
} catch {
  /* non-Unix or read-only */
}
