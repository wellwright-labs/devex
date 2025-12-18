/**
 * pulse checkin command
 * Quick micro checkin during work blocks
 */

import type { Args } from "@std/cli/parse-args";
import type { Checkin, DailyCheckins } from "../types/mod.ts";
import type { CheckinArgs, Command } from "../types/commands.ts";
import { getCheckinsPath } from "../lib/paths.ts";
import { readJson, writeJson } from "../lib/storage.ts";
import {
  getDayInBlock,
  requireBlock,
  requireExperiment,
} from "../lib/state.ts";
import {
  promptBoolean,
  promptNumber,
  promptRating,
  promptText,
} from "../lib/prompts.ts";
import {
  dim,
  formatBlockStatus,
  formatDateId,
  formatTime,
  success,
} from "../lib/format.ts";

function validate(args: Args): CheckinArgs {
  return {
    quick: Boolean(args.quick || args.q),
    help: Boolean(args.help || args.h),
  };
}

function showHelp(): void {
  console.log(`
Usage: pulse checkin [options]

Log a quick checkin for the current block.

Options:
  --quick, -q    Log neutral checkin instantly (skip prompts)
  --help, -h     Show this help

Examples:
  pulse checkin
  pulse checkin --quick
`);
}

async function run(args: CheckinArgs): Promise<void> {
  if (args.help) {
    showHelp();
    return;
  }

  const experiment = await requireExperiment();
  const block = await requireBlock();

  const now = new Date();
  const today = formatDateId(now);
  const dayInBlock = getDayInBlock(block, now);

  // Show block status
  console.log("");
  console.log(
    formatBlockStatus(block.condition, dayInBlock, block.expectedDuration),
  );
  console.log("");

  // Collect checkin data
  let checkin: Checkin;

  if (args.quick) {
    // Quick checkin: all defaults, no prompts
    checkin = {
      id: crypto.randomUUID(),
      timestamp: now,
      block: block.id,
      dayInBlock,
      prompted: false,
      energy: 3,
      focus: 3,
      stuck: false,
    };
  } else {
    // Interactive checkin
    const energy = await promptRating("Energy", 1, 5, 3);
    const focus = await promptRating("Focus", 1, 5, 3);
    const stuck = await promptBoolean("Stuck?", false);

    let stuckMinutes: number | undefined;
    if (stuck) {
      const minutes = await promptNumber("How long (minutes)?");
      if (minutes !== null) {
        stuckMinutes = minutes;
      }
    }

    const oneWord = await promptText("One word to describe right now");

    checkin = {
      id: crypto.randomUUID(),
      timestamp: now,
      block: block.id,
      dayInBlock,
      prompted: false,
      energy,
      focus,
      stuck,
      stuckMinutes,
      oneWord: oneWord || undefined,
    };
  }

  // Load existing checkins for today
  const checkinsPath = getCheckinsPath(experiment.name, today);
  const existing = await readJson<DailyCheckins>(checkinsPath);

  const dailyCheckins: DailyCheckins = existing || {
    date: today,
    checkins: [],
  };

  // Add new checkin
  dailyCheckins.checkins.push(checkin);

  // Save
  await writeJson(checkinsPath, dailyCheckins);

  console.log("");
  success(`Checkin logged at ${formatTime(now)}`);

  if (!args.quick) {
    const count = dailyCheckins.checkins.length;
    console.log(`  Today: ${count} checkin${count !== 1 ? "s" : ""}`);
  }

  console.log("");
  dim("Next: pulse daily (end of day) | pulse checkin (another checkin)");
}

export const checkinCommand: Command<CheckinArgs> = {
  name: "checkin",
  description: "Log a quick checkin",
  usage: "pulse checkin [--quick]",
  parseOptions: {
    boolean: ["quick", "help"],
    alias: { q: "quick", h: "help" },
  },
  validate,
  run,
};
