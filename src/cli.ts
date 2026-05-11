#!/usr/bin/env node
import { Command } from "commander";
import { getAuditContextReport, runAuditContext } from "./commands/auditContext.js";
import { runHook } from "./commands/hook.js";
import { runInit, type InitSource } from "./commands/init.js";
import { getLastReport, runLast } from "./commands/last.js";
import { getStatusReport, runStatus } from "./commands/status.js";

const program = new Command();

program
  .name("agent-profiler")
  .description("Local-first profiling for AI coding agents.")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize Agent Profiler for a supported source.")
  .argument("<source>", "supported: cursor | codex")
  .option("--mode <mode>", "init mode: dev or prod", "dev")
  .action((source: string, options: { mode?: string }) => {
    const allowed: InitSource[] = ["cursor", "codex"];
    if (!allowed.includes(source as InitSource)) {
      console.error(`Unsupported source: ${source}`);
      process.exitCode = 1;
      return;
    }
    if (options.mode !== "dev" && options.mode !== "prod") {
      console.error(`Unsupported mode: ${options.mode}`);
      process.exitCode = 1;
      return;
    }

    try {
      runInit(source as InitSource, options.mode);
    } catch (error) {
      console.error("Failed to initialize Agent Profiler.");
      console.error(error);
      process.exitCode = 1;
    }
  });

program
  .command("hook")
  .description("Ingest a hook event from an adapter.")
  .argument("<source>", "adapter source: cursor | codex")
  .argument("<eventName>", "source event name")
  .action(async (source: string, eventName: string) => {
    const allowed: InitSource[] = ["cursor", "codex"];
    if (!allowed.includes(source as InitSource)) {
      console.error(`Unsupported source: ${source}`);
      process.exitCode = 1;
      return;
    }

    try {
      await runHook(source as InitSource, eventName);
    } catch (error) {
      console.error("Failed to process hook event.");
      console.error(error);
      process.exitCode = 1;
    }
  });

program
  .command("status")
  .description("Show local Agent Profiler setup and ingest status.")
  .option("--mode <mode>", "status mode: dev or prod", "dev")
  .option("--json", "Output status as JSON")
  .action((options: { json?: boolean; mode?: string }) => {
    if (options.mode !== "dev" && options.mode !== "prod") {
      console.error(`Unsupported mode: ${options.mode}`);
      process.exitCode = 1;
      return;
    }
    if (options.json) {
      console.log(JSON.stringify(getStatusReport(options.mode), null, 2));
      return;
    }
    runStatus(options.mode);
  });

program
  .command("last")
  .description("Generate a report for the most recent observed session.")
  .option("--json", "Output last-session report as JSON")
  .action((options: { json?: boolean }) => {
    if (options.json) {
      console.log(JSON.stringify(getLastReport(), null, 2));
      return;
    }
    runLast();
  });

program
  .command("audit")
  .description("Audit profiler-related workspace signals.")
  .command("context")
  .description("Estimate always-on instruction/context token footprint.")
  .option("--json", "Output context audit as JSON")
  .action((options: { json?: boolean }) => {
    if (options.json) {
      console.log(JSON.stringify(getAuditContextReport(), null, 2));
      return;
    }
    runAuditContext();
  });

void program.parseAsync(process.argv);
