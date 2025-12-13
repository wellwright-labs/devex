/**
 * pulse checkin command
 * Quick micro check-in during work blocks
 */

import type { Args } from "@std/cli/parse-args";
import type { Checkin, DailyCheckins } from "../types/mod.ts";
import type { CheckinArgs, Command } from "../types/commands.ts";
import { getCheckinsPath } from "../lib/paths.ts";
import { readJson, writeJson } from "../lib/storage.ts";
import { getDayInBlock, requireBlock, requireExperiment } from "../lib/state.ts";
import { promptBoolean, promptNumber, promptRating, promptText } from "../lib/prompts.ts";
import { formatBlockStatus, formatDateId, formatTime, success } from "../lib/format.ts";

function validate(args: Args): CheckinArgs {
  return {
    quick: Boolean(args.quick || args.q),
    help: Boolean(args.help || args.h),
  };
}

function showHelp(): void {
  console.log(`
Usage: pulse checkin [options]

Log a quick check-in for the current block.

Options:
  --quick, -q    Log neutral check-in instantly (skip prompts)
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
  console.log(formatBlockStatus(block.condition, dayInBlock, block.expectedDuration));
  console.log("");

  // Collect check-in data
  let checkin: Checkin;

  if (args.quick) {
    // Quick check-in: all defaults, no prompts
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
    // Interactive check-in
    const energy = promptRating("Energy", 1, 5, 3);
    const focus = promptRating("Focus", 1, 5, 3);
    const stuck = promptBoolean("Stuck?", false);

    let stuckMinutes: number | undefined;
    if (stuck) {
      const minutes = promptNumber("How long (minutes)?");
      if (minutes !== null) {
        stuckMinutes = minutes;
      }
    }

    const oneWord = promptText("One word to describe right now");

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

  // Load existing check-ins for today
  const checkinsPath = getCheckinsPath(experiment.name, today);
  const existing = await readJson<DailyCheckins>(checkinsPath);

  const dailyCheckins: DailyCheckins = existing || {
    date: today,
    checkins: [],
  };

  // Add new check-in
  dailyCheckins.checkins.push(checkin);

  // Save
  await writeJson(checkinsPath, dailyCheckins);

  console.log("");
  success(`Check-in logged at ${formatTime(now)}`);

  if (!args.quick) {
    const count = dailyCheckins.checkins.length;
    console.log(`  Today: ${count} check-in${count !== 1 ? "s" : ""}`);
  }
}

export const checkinCommand: Command<CheckinArgs> = {
  name: "checkin",
  description: "Log a quick check-in",
  usage: "pulse checkin [--quick]",
  parseOptions: {
    boolean: ["quick", "help"],
    alias: { q: "quick", h: "help" },
  },
  validate,
  run,
};
