/**
 * pulse daily command
 * End-of-day reflection log
 */

import type { Args } from "@std/cli/parse-args";
import type { DailyLog, TaskType } from "../types/mod.ts";
import type { Command, DailyArgs } from "../types/commands.ts";
import { getDailyPath } from "../lib/paths.ts";
import { fileExists, writeJson } from "../lib/storage.ts";
import {
  getDayInBlock,
  requireBlock,
  requireExperiment,
} from "../lib/state.ts";
import { promptRating, promptText } from "../lib/prompts.ts";
import {
  dim,
  formatBlockStatus,
  formatDateId,
  info,
  success,
  warn,
} from "../lib/format.ts";
import { getConfig } from "../lib/config.ts";
import { autoCommit } from "../lib/git.ts";

function validate(args: Args): DailyArgs {
  return {
    help: Boolean(args.help || args.h),
  };
}

function showHelp(): void {
  console.log(`
Usage: pulse daily [options]

Log end-of-day reflection for the current block.

Options:
  --help, -h    Show this help

Examples:
  pulse daily
`);
}

async function run(args: DailyArgs): Promise<void> {
  if (args.help) {
    showHelp();
    return;
  }

  const experiment = await requireExperiment();
  const block = await requireBlock();

  const now = new Date();
  const today = formatDateId(now);
  const dayInBlock = getDayInBlock(block, now);

  // Check if daily log already exists
  const dailyPath = getDailyPath(experiment.name, today);
  if (await fileExists(dailyPath)) {
    warn(`Daily log for ${today} already exists.`);
    info("Use 'pulse edit daily' to modify it.");
    return;
  }

  // Show block status
  console.log("");
  console.log(
    formatBlockStatus(block.condition, dayInBlock, block.expectedDuration),
  );
  console.log(`[${today}]`);
  console.log("");

  // Collect daily log data
  const shipped = await promptText("What did you ship today?");
  const struggled = await promptText("What did you struggle with?");

  console.log("");
  console.log("Ratings (1-5, Enter to skip):");
  const confidence = await promptRating(
    "  Confidence in today's code",
    1,
    5,
    3,
  );
  const understanding = await promptRating(
    "  Understanding of today's code",
    1,
    5,
    3,
  );
  const fulfillment = await promptRating("  Fulfillment", 1, 5, 3);
  const enjoyment = await promptRating("  Enjoyment", 1, 5, 3);
  const cognitiveLoad = await promptRating("  Cognitive load", 1, 5, 3);

  console.log("");
  console.log("Task types:");
  dim("  r = Routine: Familiar work, low cognitive load (bug fixes, updates)");
  dim("  i = Integrative: Connecting pieces (refactoring, integration)");
  dim("  c = Creative: Novel problem solving (new features, architecture)");
  const taskTypesInput = await promptText("Task types today");
  const taskTypes = parseTaskTypes(taskTypesInput);

  const notes = await promptText("Notes (optional)");

  // Create daily log
  const dailyLog: DailyLog = {
    date: today,
    block: block.id,
    completedAt: now,
    shipped: shipped || undefined,
    struggled: struggled || undefined,
    ratings: {
      confidence,
      understanding,
      fulfillment,
      enjoyment,
      cognitiveLoad,
    },
    taskTypes: taskTypes.length > 0 ? taskTypes : undefined,
    notes: notes || undefined,
  };

  // Save
  await writeJson(dailyPath, dailyLog);

  // Auto-commit if enabled
  const config = await getConfig();
  if (config.git.autoCommit && config.git.commitOnDailyLog) {
    await autoCommit(`Daily log: ${today}`);
  }

  console.log("");
  success("Daily log saved");
  console.log("");
  dim("Next: pulse weekly (end of week) | pulse block status");
}

function parseTaskTypes(input: string): TaskType[] {
  const types: TaskType[] = [];
  const chars = input.toLowerCase().split("");

  for (const char of chars) {
    if (char === "r" && !types.includes("routine")) {
      types.push("routine");
    } else if (char === "i" && !types.includes("integrative")) {
      types.push("integrative");
    } else if (char === "c" && !types.includes("creative")) {
      types.push("creative");
    }
  }

  return types;
}

export const dailyCommand: Command<DailyArgs> = {
  name: "daily",
  description: "Log end-of-day reflection",
  usage: "pulse daily",
  parseOptions: {
    boolean: ["help"],
    alias: { h: "help" },
  },
  validate,
  run,
};
