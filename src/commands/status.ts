/**
 * devex status command
 * Dashboard view of experiment progress
 */

import type { Args } from "@std/cli/parse-args";
import type { DailyCheckins } from "../types/mod.ts";
import type { Command, StatusArgs } from "../types/commands.ts";
import { getCheckinsPath, getDailyPath, getWeeklyPath } from "../lib/paths.ts";
import { fileExists, readJson } from "../lib/storage.ts";
import {
  getCurrentBlock,
  getDayInBlock,
  requireExperiment,
} from "../lib/state.ts";
import { getConfig } from "../lib/config.ts";
import {
  dim,
  dimText,
  formatBlockStatus,
  formatDateId,
  formatWeekId,
  info,
} from "../lib/format.ts";

function validate(args: Args): StatusArgs {
  return {
    help: Boolean(args.help || args.h),
  };
}

function showHelp(): void {
  console.log(`
Usage: devex status [options]

Show experiment dashboard with progress and next actions.

Options:
  --help, -h    Show this help

Examples:
  devex status
`);
}

async function run(args: StatusArgs): Promise<void> {
  if (args.help) {
    showHelp();
    return;
  }

  const experiment = await requireExperiment();
  const block = await getCurrentBlock();

  if (!block) {
    info("No active block.");
    console.log("");
    console.log(`Start one with: devex block start <condition>`);
    console.log(
      `Available conditions: ${Object.keys(experiment.conditions).join(", ")}`,
    );
    return;
  }

  const config = await getConfig();
  const now = new Date();
  const today = formatDateId(now);
  const thisWeek = formatWeekId(now);
  const dayInBlock = getDayInBlock(block, now);

  // Load today's data
  const checkinsPath = getCheckinsPath(experiment.name, today);
  const dailyPath = getDailyPath(experiment.name, today);
  const weeklyPath = getWeeklyPath(experiment.name, thisWeek);

  const todaysCheckins = await readJson<DailyCheckins>(checkinsPath);
  const checkinCount = todaysCheckins?.checkins.length ?? 0;
  const expectedCheckins = config.defaults.checkinFrequency;

  const hasDailyLog = await fileExists(dailyPath);
  const hasWeeklyLog = await fileExists(weeklyPath);

  // Find missed daily logs
  const missedDailies = await findMissedDailies(
    experiment.name,
    block.startDate,
    now,
  );

  // Calculate next action
  const nextAction = calculateNextAction(
    now,
    checkinCount,
    expectedCheckins,
    todaysCheckins?.checkins ?? [],
    hasDailyLog,
    hasWeeklyLog,
  );

  // Render dashboard
  console.log("");
  console.log(
    formatBlockStatus(block.condition, dayInBlock, block.expectedDuration),
  );
  console.log("");

  // Today section
  const dayName = now.toLocaleDateString("en-US", { weekday: "short" });
  console.log(`Today (${dayName} ${today.slice(5)}):`);

  const checkinStatus = checkinCount >= expectedCheckins
    ? `${checkinCount} of ${expectedCheckins}`
    : `${checkinCount} of ${expectedCheckins}  ${
      dimText(`← ${expectedCheckins - checkinCount} more expected`)
    }`;
  console.log(`  Check-ins: ${checkinStatus}`);

  const dailyStatus = hasDailyLog ? "done" : dimText("not yet");
  console.log(`  Daily log: ${dailyStatus}`);

  // This week section
  console.log("");
  console.log(`This week (${thisWeek}):`);
  const weeklyStatus = hasWeeklyLog ? "done" : dimText("not yet");
  console.log(`  Weekly log: ${weeklyStatus}`);

  // Missed section
  if (missedDailies.length > 0) {
    console.log("");
    console.log("Missed:");
    const missedDates = missedDailies
      .slice(-5) // Show last 5 at most
      .map((d) => d.slice(5)) // Remove year prefix
      .join(", ");
    console.log(`  Daily logs: ${missedDates}`);
    if (missedDailies.length > 5) {
      dim(`  ...and ${missedDailies.length - 5} more`);
    }
  }

  // Next action
  console.log("");
  console.log(`Next: ${nextAction}`);
  console.log("");
}

/**
 * Find dates in the block that are missing daily logs (excluding today)
 */
async function findMissedDailies(
  experimentName: string,
  blockStart: Date,
  now: Date,
): Promise<string[]> {
  const missed: string[] = [];
  const today = formatDateId(now);

  // Iterate through each day from block start to yesterday
  const current = new Date(blockStart);
  current.setHours(0, 0, 0, 0);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59, 999);

  while (current <= yesterday) {
    const dateId = formatDateId(current);
    if (dateId !== today) {
      const dailyPath = getDailyPath(experimentName, dateId);
      if (!(await fileExists(dailyPath))) {
        missed.push(dateId);
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return missed;
}

export interface CheckinRecord {
  timestamp: Date;
}

/**
 * Calculate the next recommended action with timing
 */
export function calculateNextAction(
  now: Date,
  checkinCount: number,
  expectedCheckins: number,
  checkins: CheckinRecord[],
  hasDailyLog: boolean,
  hasWeeklyLog: boolean,
): string {
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday

  // End of day (after 5pm) - suggest daily if not done
  if (hour >= 17 && !hasDailyLog) {
    return "devex daily";
  }

  // Friday or later in the week - suggest weekly if not done
  if (dayOfWeek >= 5 && !hasWeeklyLog) {
    return "devex weekly";
  }

  // Need more checkins today
  if (checkinCount < expectedCheckins) {
    const nextCheckinTime = calculateNextCheckinTime(
      now,
      checkins,
      expectedCheckins,
    );
    if (nextCheckinTime) {
      return `devex checkin ${dimText(`(${nextCheckinTime})`)}`;
    }
    return "devex checkin";
  }

  // All checkins done, daily not done
  if (!hasDailyLog) {
    return `devex daily ${dimText("(end of day)")}`;
  }

  // Weekly not done
  if (!hasWeeklyLog) {
    return `devex weekly ${dimText("(end of week)")}`;
  }

  // All caught up!
  return dimText("all caught up for now");
}

/**
 * Calculate when the next checkin should happen
 * Based on spreading checkins across an 8-hour workday (9am-5pm)
 */
export function calculateNextCheckinTime(
  now: Date,
  checkins: CheckinRecord[],
  expectedCheckins: number,
): string | null {
  const hour = now.getHours();
  const minute = now.getMinutes();

  // Work hours: 9am to 5pm
  const workStart = 9;
  const workEnd = 17;

  // If before work hours, first checkin at 9am
  if (hour < workStart) {
    return "around 9am";
  }

  // If after work hours, no more checkins expected
  if (hour >= workEnd) {
    return null;
  }

  // Calculate remaining checkins
  const checkinsRemaining = expectedCheckins - checkins.length;

  if (checkinsRemaining <= 0) {
    return null;
  }

  // Time remaining in workday
  const hoursRemaining = workEnd - hour - (minute / 60);

  // If we have time for remaining checkins with good spacing
  const nextIntervalHours = hoursRemaining / checkinsRemaining;

  if (nextIntervalHours < 0.5) {
    // Less than 30 min - do it now
    return "now";
  } else if (nextIntervalHours < 1) {
    return "in ~30 min";
  } else if (nextIntervalHours < 2) {
    return "in ~1 hour";
  } else {
    const hours = Math.round(nextIntervalHours);
    return `in ~${hours} hours`;
  }
}

export const statusCommand: Command<StatusArgs> = {
  name: "status",
  description: "Show experiment dashboard",
  usage: "devex status",
  parseOptions: {
    boolean: ["help"],
    alias: { h: "help" },
  },
  validate,
  run,
};
