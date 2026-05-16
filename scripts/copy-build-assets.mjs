import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

fs.copyFileSync(
  path.join(root, "src/core/schema.sql"),
  path.join(root, "dist/core/schema.sql"),
);

fs.cpSync(
  path.join(root, "src/dashboard/public"),
  path.join(root, "dist/dashboard"),
  {
    recursive: true,
  },
);

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
