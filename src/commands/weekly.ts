/**
 * devex weekly command
 * Weekly reflection log
 */

import type { Args } from "@std/cli/parse-args";
import type { WeeklyReflection } from "../types/mod.ts";
import type { Command, WeeklyArgs } from "../types/commands.ts";
import { getWeeklyPath } from "../lib/paths.ts";
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
  formatWeekId,
  info,
  success,
  warn,
} from "../lib/format.ts";
import { getConfig } from "../lib/config.ts";
import { autoCommit } from "../lib/git.ts";

function validate(args: Args): WeeklyArgs {
  return {
    help: Boolean(args.help || args.h),
  };
}

function showHelp(): void {
  console.log(`
Usage: devex weekly [options]

Log weekly reflection for the current block.

Options:
  --help, -h    Show this help

Examples:
  devex weekly
`);
}

async function run(args: WeeklyArgs): Promise<void> {
  if (args.help) {
    showHelp();
    return;
  }

  const experiment = await requireExperiment();
  const block = await requireBlock();

  const now = new Date();
  const weekId = formatWeekId(now);

  // Check if weekly reflection already exists
  const weeklyPath = getWeeklyPath(experiment.name, weekId);
  if (await fileExists(weeklyPath)) {
    warn(`Weekly reflection for ${weekId} already exists.`);
    info("Use 'devex edit weekly' to modify it.");
    return;
  }

  // Show block status
  console.log("");
  console.log(
    formatBlockStatus(
      block.condition,
      getDayInBlock(block, now),
      block.expectedDuration,
    ),
  );
  console.log(`[Week: ${weekId}]`);
  console.log("");

  // Collect weekly reflection data
  const shipped = await promptText("What did you ship this week?");
  const patterns = await promptText("What patterns did you notice?");
  const frustrations = await promptText("What frustrated you?");
  const delights = await promptText("What delighted you?");
  const codebaseFeel = await promptText("How do you feel about the codebase?");
  const lookingForward = await promptText("What are you looking forward to?");
  const wouldChange = await promptText("What would you do differently?");

  console.log("");
  console.log("Ratings (1-5, Enter to skip):");
  const productivity = await promptRating("  Productivity", 1, 5, 3);
  const quality = await promptRating("  Code quality", 1, 5, 3);
  const fulfillment = await promptRating("  Fulfillment", 1, 5, 3);
  const mentalClarity = await promptRating("  Mental clarity", 1, 5, 3);

  // Create weekly reflection
  const weeklyReflection: WeeklyReflection = {
    week: weekId,
    block: block.id,
    completedAt: now,
    shipped: shipped || undefined,
    patterns: patterns || undefined,
    frustrations: frustrations || undefined,
    delights: delights || undefined,
    codebaseFeel: codebaseFeel || undefined,
    lookingForward: lookingForward || undefined,
    wouldChange: wouldChange || undefined,
    ratings: {
      productivity,
      quality,
      fulfillment,
      mentalClarity,
    },
  };

  // Save
  await writeJson(weeklyPath, weeklyReflection);

  // Auto-commit if enabled
  const config = await getConfig();
  if (config.git.autoCommit && config.git.commitOnWeeklyReflection) {
    await autoCommit(`Weekly reflection: ${weekId}`);
  }

  console.log("");
  success("Weekly reflection saved");
  console.log("");
  dim("Next: devex report | devex block status");
}

export const weeklyCommand: Command<WeeklyArgs> = {
  name: "weekly",
  description: "Log weekly reflection",
  usage: "devex weekly",
  parseOptions: {
    boolean: ["help"],
    alias: { h: "help" },
  },
  validate,
  run,
};
