/**
 * devex export command
 * Export all experiment data as JSON
 */

import type { Args } from "@std/cli/parse-args";
import type {
  Block,
  DailyCheckins,
  DailyLog,
  Experiment,
  WeeklyReflection,
} from "../types/mod.ts";
import type { Command, ExportArgs } from "../types/commands.ts";
import {
  getCheckinsDir,
  getDailyDir,
  getDevLogPath,
  getWeeklyDir,
} from "../lib/paths.ts";
import { fileExists, listFiles, readJson, writeJson } from "../lib/storage.ts";
import { listBlocksForExperiment, requireExperiment } from "../lib/state.ts";
import { success } from "../lib/format.ts";

interface ExportData {
  exportedAt: Date;
  experiment: Experiment;
  blocks: Block[];
  checkins: Record<string, DailyCheckins>;
  dailyLogs: Record<string, DailyLog>;
  weeklyReflections: Record<string, WeeklyReflection>;
  devLog: string;
}

function validate(args: Args): ExportArgs {
  return {
    output: args.output as string | undefined ?? args.o as string | undefined,
    help: Boolean(args.help || args.h),
  };
}

function showHelp(): void {
  console.log(`
Usage: devex export [options]

Export all experiment data as JSON.

Options:
  --output, -o <file>    Write to file instead of stdout
  --help, -h             Show this help

Examples:
  devex export                     # Print JSON to stdout
  devex export -o backup.json      # Write to file
`);
}

async function run(args: ExportArgs): Promise<void> {
  if (args.help) {
    showHelp();
    return;
  }

  const experiment = await requireExperiment();
  const exportData = await collectExportData(experiment);

  if (args.output) {
    await writeJson(args.output, exportData);
    success(`Exported to ${args.output}`);
  } else {
    console.log(JSON.stringify(exportData, dateReplacer, 2));
  }
}

async function collectExportData(experiment: Experiment): Promise<ExportData> {
  const experimentName = experiment.name;

  // Load all blocks
  const blocks = await listBlocksForExperiment(experimentName);

  // Load all checkins
  const checkins: Record<string, DailyCheckins> = {};
  const checkinsDir = getCheckinsDir(experimentName);
  const checkinFiles = await listFiles(checkinsDir);
  for (const file of checkinFiles) {
    if (!file.endsWith(".json")) continue;
    const dateStr = file.replace(".json", "");
    const data = await readJson<DailyCheckins>(`${checkinsDir}/${file}`);
    if (data) {
      checkins[dateStr] = data;
    }
  }

  // Load all daily logs
  const dailyLogs: Record<string, DailyLog> = {};
  const dailyDir = getDailyDir(experimentName);
  const dailyFiles = await listFiles(dailyDir);
  for (const file of dailyFiles) {
    if (!file.endsWith(".json")) continue;
    const dateStr = file.replace(".json", "");
    const data = await readJson<DailyLog>(`${dailyDir}/${file}`);
    if (data) {
      dailyLogs[dateStr] = data;
    }
  }

  // Load all weekly reflections
  const weeklyReflections: Record<string, WeeklyReflection> = {};
  const weeklyDir = getWeeklyDir(experimentName);
  const weeklyFiles = await listFiles(weeklyDir);
  for (const file of weeklyFiles) {
    if (!file.endsWith(".json")) continue;
    const weekStr = file.replace(".json", "");
    const data = await readJson<WeeklyReflection>(`${weeklyDir}/${file}`);
    if (data) {
      weeklyReflections[weekStr] = data;
    }
  }

  // Load dev log
  const devLogPath = getDevLogPath(experimentName);
  let devLog = "";
  if (await fileExists(devLogPath)) {
    try {
      devLog = await Deno.readTextFile(devLogPath);
    } catch {
      // Ignore read errors
    }
  }

  return {
    exportedAt: new Date(),
    experiment,
    blocks,
    checkins,
    dailyLogs,
    weeklyReflections,
    devLog,
  };
}

/**
 * JSON replacer that converts Date objects to ISO strings
 */
function dateReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

export const exportCommand: Command<ExportArgs> = {
  name: "export",
  description: "Export experiment data as JSON",
  usage: "devex export [--output file]",
  parseOptions: {
    boolean: ["help"],
    string: ["output"],
    alias: { h: "help", o: "output" },
  },
  validate,
  run,
};
