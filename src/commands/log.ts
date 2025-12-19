/**
 * devex log command
 * Append freeform observations to dev log
 * Works with or without an active block
 */

import type { Args } from "@std/cli/parse-args";
import type { Command, LogArgs } from "../types/commands.ts";
import { getDevLogPath } from "../lib/paths.ts";
import { appendToFile } from "../lib/storage.ts";
import { getCurrentBlock, getCurrentExperiment } from "../lib/state.ts";
import { promptText } from "../lib/prompts.ts";
import { error, formatDateTime, formatTime, success } from "../lib/format.ts";

function validate(args: Args): LogArgs {
  // Collect all positional args after "log" as the message
  const messageParts = args._.slice(1).map(String);
  return {
    message: messageParts.length > 0 ? messageParts.join(" ") : undefined,
    help: Boolean(args.help || args.h),
  };
}

function showHelp(): void {
  console.log(`
Usage: devex log [message] [options]

Append a freeform observation to the dev log.
Works with or without an active block.

Arguments:
  message       Log message (prompted if not provided)

Options:
  --help, -h    Show this help

Examples:
  devex log "Finally cracked the caching bug"
  devex log
`);
}

async function run(args: LogArgs): Promise<void> {
  if (args.help) {
    showHelp();
    return;
  }

  const experiment = await getCurrentExperiment();

  if (!experiment) {
    error("No active experiment. Create one with: devex init");
    Deno.exit(1);
  }

  // Get message from args or prompt
  let message = args.message;
  const devLogPath = getDevLogPath(experiment.name);

  if (!message) {
    const input = await promptText("Log entry");
    if (!input) {
      // User cancelled or empty input
      return;
    }
    message = input;
  }

  const now = new Date();
  const block = await getCurrentBlock();

  // Format the log entry
  let entry: string;
  if (block) {
    // Include block context
    entry = `**${formatTime(now)}** [${block.condition}] ${message}\n\n`;
  } else {
    // No block context
    entry = `**${formatDateTime(now)}** ${message}\n\n`;
  }

  // Append to dev log
  await appendToFile(devLogPath, entry);

  success(`Logged at ${formatTime(now)}`);
}

export const logCommand: Command<LogArgs> = {
  name: "log",
  description: "Append to dev log",
  usage: "devex log [message]",
  parseOptions: {
    boolean: ["help"],
    alias: { h: "help" },
  },
  validate,
  run,
};
