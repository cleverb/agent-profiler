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

try {
  fs.chmodSync(path.join(root, "dist/cli.js"), 0o755);
} catch {
  /* non-Unix or read-only */
}
