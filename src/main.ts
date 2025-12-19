/**
 * Devex CLI entry point
 * Routes commands to their handlers
 */

import { parseArgs } from "@std/cli/parse-args";
import { initCommand } from "./commands/init.ts";
import { blockCommand } from "./commands/block.ts";
import { checkinCommand } from "./commands/checkin.ts";
import { dailyCommand } from "./commands/daily.ts";
import { weeklyCommand } from "./commands/weekly.ts";
import { logCommand } from "./commands/log.ts";
import { configCommand } from "./commands/config.ts";
import { editCommand } from "./commands/edit.ts";
import { exportCommand } from "./commands/export.ts";
import { gitCommand } from "./commands/git.ts";
import { syncCommand } from "./commands/sync.ts";
import { metricsCommand } from "./commands/metrics.ts";
import { reportCommand } from "./commands/report.ts";
import { compareCommand } from "./commands/compare.ts";
import { statusCommand } from "./commands/status.ts";
import { showHelp, showVersion } from "./lib/help.ts";
import { error } from "./lib/format.ts";

// Command registry - commands self-describe their args
const commands = {
  init: initCommand,
  block: blockCommand,
  checkin: checkinCommand,
  daily: dailyCommand,
  weekly: weeklyCommand,
  log: logCommand,
  config: configCommand,
  edit: editCommand,
  export: exportCommand,
  git: gitCommand,
  sync: syncCommand,
  metrics: metricsCommand,
  report: reportCommand,
  compare: compareCommand,
  status: statusCommand,
} as const;

type CommandName = keyof typeof commands;

async function main(): Promise<void> {
  // First pass: just get command name and global flags
  const baseArgs = parseArgs(Deno.args, {
    boolean: ["help", "version"],
    alias: { h: "help", v: "version" },
    stopEarly: true, // Stop at first positional so commands can parse their own args
  });

  // Handle global flags
  if (baseArgs.version) {
    showVersion();
    return;
  }

  const commandName = baseArgs._[0]?.toString() as CommandName | undefined;

  if (baseArgs.help && !commandName) {
    showHelp();
    return;
  }

  if (!commandName) {
    showHelp();
    return;
  }

  // Route to command
  const command = commands[commandName];

  if (!command) {
    error(`Unknown command: ${commandName}`);
    console.log("\nRun 'devex --help' for usage information.");
    Deno.exit(1);
  }

  // Parse args with command-specific options
  const booleanFlags = command.parseOptions.boolean || [];
  const booleanArray = Array.isArray(booleanFlags)
    ? booleanFlags
    : [booleanFlags];

  const args = parseArgs(Deno.args, {
    ...command.parseOptions,
    boolean: [...booleanArray, "help"],
    alias: { ...command.parseOptions.alias, h: "help" },
  });

  try {
    const validatedArgs = command.validate(args);
    await command.run(validatedArgs as never); // Command handles its own type
  } catch (err) {
    if (err instanceof Error) {
      error(err.message);
    } else {
      error(String(err));
    }
    Deno.exit(1);
  }
}

main();
