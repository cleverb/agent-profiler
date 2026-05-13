#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const pkgRoot = path.join(__dirname, "..");

function usage() {
  process.stdout.write(
    [
      "adr-agent-skill",
      "",
      "Usage:",
      "  adr-agent-skill init [--dir <path>]     Copy skill files into a target folder (default: .cursor/skills/adr-agent-skill)",
      "  adr-agent-skill doctor                    Verify SKILL.md and assets are present",
      "  adr-agent-skill bootstrap [...]         Pass-through to scripts/bootstrap_adr.cjs",
      "  adr-agent-skill new [...]               Pass-through to scripts/new_adr.cjs",
      "  adr-agent-skill set-status [...]       Pass-through to scripts/set_adr_status.cjs",
      "",
    ].join("\n"),
  );
}

const [, , cmd = "help", ...rest] = process.argv;

if (cmd === "doctor") {
  const skill = path.join(pkgRoot, "SKILL.md");
  if (!fs.existsSync(skill)) {
    process.stderr.write("SKILL.md missing\n");
    process.exit(1);
  }
  process.stdout.write("SKILL.md OK\n");
  process.exit(0);
}

if (cmd === "init") {
  let outDir = path.join(process.cwd(), ".cursor", "skills", "adr-agent-skill");
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--dir" && rest[i + 1]) {
      outDir = path.resolve(process.cwd(), rest[++i]);
    }
  }
  fs.mkdirSync(outDir, { recursive: true });
  const existing = fs.existsSync(outDir) ? fs.readdirSync(outDir) : [];
  if (existing.length > 0) {
    process.stderr.write(`Target is not empty: ${outDir}\n`);
    process.exit(1);
  }
  fs.cpSync(pkgRoot, outDir, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(pkgRoot, src);
      if (!rel || rel === ".") return true;
      const first = rel.split(path.sep)[0];
      if (first === "node_modules" || first === ".git") return false;
      if (rel === "package.json") return false;
      return true;
    },
  });
  process.stdout.write(`Copied skill to ${outDir}\n`);
  process.stdout.write(
    "Point Cursor at this folder (e.g. .cursor/skills/adr-agent-skill/SKILL.md) or add a rule that loads it.\n",
  );
  process.exit(0);
}

const scripts = {
  bootstrap: "bootstrap_adr.cjs",
  new: "new_adr.cjs",
  "set-status": "set_adr_status.cjs",
};

if (scripts[cmd]) {
  const scriptPath = path.join(pkgRoot, "scripts", scripts[cmd]);
  const r = spawnSync(process.execPath, [scriptPath, ...rest], {
    stdio: "inherit",
  });
  process.exit(r.status === null ? 1 : r.status);
}

usage();
process.exit(cmd === "help" ? 0 : 1);
