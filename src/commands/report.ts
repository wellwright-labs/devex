/**
 * pulse report command
 * Generate analysis report for a block
 */

import type { Args } from "@std/cli/parse-args";
import type { Command, ReportArgs } from "../types/commands.ts";
import type { GitMetrics } from "../types/mod.ts";
import { getConfig } from "../lib/config.ts";
import { getMetricsPath } from "../lib/paths.ts";
import { readJson } from "../lib/storage.ts";
import { getCurrentBlock, loadBlock, requireExperiment } from "../lib/state.ts";
import {
  aggregateCheckins,
  aggregateDailyLogs,
  loadCheckinsForBlock,
  loadDailyLogsForBlock,
} from "../lib/analysis.ts";
import { dim, error, formatDate } from "../lib/format.ts";

function validate(args: Args): ReportArgs {
  return {
    block: (args.block as string) || (args.b as string),
    help: Boolean(args.help || args.h),
  };
}

function showHelp(): void {
  console.log(`
Usage: pulse report [options]

Generate analysis report for a block.

Options:
  --block, -b <id>   Block to report on (default: current)
  --help, -h         Show this help

Examples:
  pulse report
  pulse report --block no-ai-1
`);
}

async function run(args: ReportArgs): Promise<void> {
  if (args.help) {
    showHelp();
    return;
  }

  const experiment = await requireExperiment();

  // Get block
  let block;
  if (args.block) {
    block = await loadBlock(args.block);
    if (!block) {
      error(`Block not found: ${args.block}`);
      Deno.exit(1);
    }
  } else {
    block = await getCurrentBlock();
    if (!block) {
      error("No active block. Specify a block with --block <id>");
      Deno.exit(1);
    }
  }

  // Load data
  const checkins = await loadCheckinsForBlock(experiment.name, block);
  const dailyLogs = await loadDailyLogsForBlock(experiment.name, block);

  // Aggregate
  const checkinStats = aggregateCheckins(checkins);
  const dailyStats = aggregateDailyLogs(dailyLogs);

  // Load cached git metrics if available
  const metricsPath = getMetricsPath(experiment.name, block.id);
  const gitMetrics = await readJson<GitMetrics>(metricsPath);

  // Get config for repo info
  const config = await getConfig();

  // Display report
  const endDate = block.endDate ?? new Date();

  console.log("");
  console.log("╭" + "─".repeat(60) + "╮");
  console.log(
    `│  Report: ${block.id} (${formatDate(block.startDate)} - ${
      formatDate(endDate)
    })`.padEnd(61) + "│",
  );
  console.log(
    `│  Condition: ${block.condition}`.padEnd(61) + "│",
  );
  console.log("╰" + "─".repeat(60) + "╯");
  console.log("");

  // Git Metrics
  if (gitMetrics) {
    console.log("GIT METRICS");
    const t = gitMetrics.totals;
    console.log(
      `  Commits: ${t.commits}`.padEnd(25) +
        `Lines: +${t.linesAdded.toLocaleString()} / -${t.linesRemoved.toLocaleString()}`,
    );
    console.log(
      `  Test files: ${t.testFilesChanged}`.padEnd(25) +
        `Doc files: ${t.docFilesChanged}`,
    );
    console.log("");
  } else if (config.repositories.length > 0) {
    dim("GIT METRICS: Run 'pulse metrics' to compute");
    console.log("");
  }

  // Checkin Stats
  console.log(
    `CHECK-INS (${checkinStats.count} entries${
      checkinStats.count > 0 ? `, ${checkinStats.promptedCount} prompted` : ""
    })`,
  );
  if (checkinStats.count > 0) {
    const energyStr = checkinStats.avgEnergy !== null
      ? `${checkinStats.avgEnergy} avg`
      : "N/A";
    const focusStr = checkinStats.avgFocus !== null
      ? `${checkinStats.avgFocus} avg`
      : "N/A";
    console.log(
      `  Energy: ${energyStr}`.padEnd(25) + `Focus: ${focusStr}`,
    );

    const stuckStr = `${checkinStats.stuckPercent}%`;
    const stuckTimeStr = checkinStats.avgStuckMinutes !== null
      ? `${checkinStats.avgStuckMinutes} min avg`
      : "";
    console.log(
      `  Stuck: ${stuckStr}`.padEnd(25) +
        (stuckTimeStr ? `Avg stuck time: ${stuckTimeStr}` : ""),
    );

    if (checkinStats.topWords.length > 0) {
      const words = checkinStats.topWords
        .map((w) => `${w.word} (${w.count})`)
        .join(", ");
      console.log(`  Top words: ${words}`);
    }
  } else {
    dim("  No checkins recorded");
  }
  console.log("");

  // Daily Stats
  console.log(`DAILY RATINGS (${dailyStats.count} entries)`);
  if (dailyStats.count > 0) {
    const r = dailyStats.avgRatings;
    const formatRating = (
      v: number | null,
    ) => (v !== null ? v.toString() : "N/A");

    console.log(
      `  Confidence: ${formatRating(r.confidence)}`.padEnd(25) +
        `Understanding: ${formatRating(r.understanding)}`,
    );
    console.log(
      `  Fulfillment: ${formatRating(r.fulfillment)}`.padEnd(25) +
        `Enjoyment: ${formatRating(r.enjoyment)}`,
    );
    console.log(`  Cognitive Load: ${formatRating(r.cognitiveLoad)}`);
  } else {
    dim("  No daily logs recorded");
  }
  console.log("");

  // Task Distribution
  if (dailyStats.count > 0) {
    const d = dailyStats.taskTypeDistribution;
    if (d.routine > 0 || d.integrative > 0 || d.creative > 0) {
      console.log("TASK DISTRIBUTION");
      console.log(
        `  Routine: ${d.routine}%    Integrative: ${d.integrative}%    Creative: ${d.creative}%`,
      );
      console.log("");
    }
  }

  console.log("");
}

export const reportCommand: Command<ReportArgs> = {
  name: "report",
  description: "Generate analysis report for a block",
  usage: "pulse report [--block <id>]",
  parseOptions: {
    string: ["block"],
    boolean: ["help"],
    alias: { b: "block", h: "help" },
  },
  validate,
  run,
};
