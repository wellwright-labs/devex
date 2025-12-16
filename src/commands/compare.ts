/**
 * pulse compare command
 * Compare metrics and stats between blocks
 */

import type { Args } from "@std/cli/parse-args";
import type { Command, CompareArgs } from "../types/commands.ts";
import type {
  Block,
  CheckinStats,
  DailyStats,
  GitMetrics,
} from "../types/mod.ts";
import { getMetricsPath } from "../lib/paths.ts";
import { readJson } from "../lib/storage.ts";
import { loadBlock, requireExperiment } from "../lib/state.ts";
import {
  aggregateCheckins,
  aggregateDailyLogs,
  loadCheckinsForBlock,
  loadDailyLogsForBlock,
  loadViolationsForBlock,
} from "../lib/analysis.ts";
import { dim, error } from "../lib/format.ts";

function validate(args: Args): CompareArgs {
  // Get block IDs from positional args (after "compare")
  const blocks = args._.slice(1).map(String);

  return {
    blocks,
    help: Boolean(args.help || args.h),
  };
}

function showHelp(): void {
  console.log(`
Usage: pulse compare <block1> <block2>

Compare metrics and stats between two blocks.

Arguments:
  block1, block2    Block IDs to compare

Options:
  --help, -h        Show this help

Examples:
  pulse compare no-ai-1 full-ai-1
`);
}

interface BlockData {
  block: Block;
  gitMetrics: GitMetrics | null;
  checkinStats: CheckinStats;
  dailyStats: DailyStats;
  violations: number;
}

async function run(args: CompareArgs): Promise<void> {
  if (args.help) {
    showHelp();
    return;
  }

  if (args.blocks.length < 2) {
    error("Please provide two block IDs to compare.");
    showHelp();
    Deno.exit(1);
  }

  const experiment = await requireExperiment();

  // Load both blocks
  const blockData: BlockData[] = [];

  for (const blockId of args.blocks.slice(0, 2)) {
    const block = await loadBlock(blockId);
    if (!block) {
      error(`Block not found: ${blockId}`);
      Deno.exit(1);
    }

    const checkins = await loadCheckinsForBlock(experiment.name, block);
    const dailyLogs = await loadDailyLogsForBlock(experiment.name, block);
    const violations = await loadViolationsForBlock(experiment.name, blockId);
    const metricsPath = getMetricsPath(experiment.name, blockId);
    const gitMetrics = await readJson<GitMetrics>(metricsPath);

    blockData.push({
      block,
      gitMetrics,
      checkinStats: aggregateCheckins(checkins),
      dailyStats: aggregateDailyLogs(dailyLogs),
      violations: violations.length,
    });
  }

  const [a, b] = blockData;

  // Display comparison
  console.log("");
  console.log(`Comparison: ${a.block.id} vs ${b.block.id}`);
  console.log("═".repeat(60));
  console.log("");

  // Header
  const col1 = 24;
  const col2 = 12;
  const col3 = 12;
  const col4 = 10;

  console.log(
    "".padEnd(col1) +
      a.block.id.padStart(col2) +
      b.block.id.padStart(col3) +
      "Δ".padStart(col4),
  );
  console.log("─".repeat(60));

  // Git Metrics
  if (a.gitMetrics && b.gitMetrics) {
    const am = a.gitMetrics.totals;
    const bm = b.gitMetrics.totals;

    printRow("Commits", am.commits, bm.commits, col1, col2, col3, col4);
    printRow(
      "Lines changed",
      am.linesAdded + am.linesRemoved,
      bm.linesAdded + bm.linesRemoved,
      col1,
      col2,
      col3,
      col4,
    );
    printRow(
      "Test files changed",
      am.testFilesChanged,
      bm.testFilesChanged,
      col1,
      col2,
      col3,
      col4,
    );
    printRow(
      "Avg commits/day",
      am.avgCommitsPerDay,
      bm.avgCommitsPerDay,
      col1,
      col2,
      col3,
      col4,
      true,
    );
    console.log("");
  } else {
    dim("Git metrics not available for both blocks");
    console.log("");
  }

  // Checkin Stats
  const ac = a.checkinStats;
  const bc = b.checkinStats;

  printRow("Energy", ac.avgEnergy, bc.avgEnergy, col1, col2, col3, col4, true);
  printRow("Focus", ac.avgFocus, bc.avgFocus, col1, col2, col3, col4, true);
  printRow(
    "Stuck %",
    ac.stuckPercent,
    bc.stuckPercent,
    col1,
    col2,
    col3,
    col4,
    false,
    true,
  );
  console.log("");

  // Daily Stats
  const ad = a.dailyStats.avgRatings;
  const bd = b.dailyStats.avgRatings;

  printRow(
    "Confidence",
    ad.confidence,
    bd.confidence,
    col1,
    col2,
    col3,
    col4,
    true,
  );
  printRow(
    "Understanding",
    ad.understanding,
    bd.understanding,
    col1,
    col2,
    col3,
    col4,
    true,
  );
  printRow(
    "Fulfillment",
    ad.fulfillment,
    bd.fulfillment,
    col1,
    col2,
    col3,
    col4,
    true,
  );
  printRow(
    "Enjoyment",
    ad.enjoyment,
    bd.enjoyment,
    col1,
    col2,
    col3,
    col4,
    true,
  );
  printRow(
    "Cognitive Load",
    ad.cognitiveLoad,
    bd.cognitiveLoad,
    col1,
    col2,
    col3,
    col4,
    true,
  );
  console.log("");

  // Violations
  printRow(
    "Violations",
    a.violations,
    b.violations,
    col1,
    col2,
    col3,
    col4,
  );

  console.log("─".repeat(60));
  console.log("");

  // Hypothesis evaluation
  if (experiment.hypotheses.length > 0) {
    console.log("HYPOTHESIS EVALUATION");
    console.log("Based on data collected:");
    console.log("");

    for (let i = 0; i < experiment.hypotheses.length; i++) {
      const h = experiment.hypotheses[i];
      console.log(`H${i + 1}: "${h}"`);
      dim("    → (Evaluate manually based on metrics above)");
      console.log("");
    }
  }
}

function printRow(
  label: string,
  valA: number | null,
  valB: number | null,
  col1: number,
  col2: number,
  col3: number,
  col4: number,
  decimal = false,
  isPercent = false,
): void {
  const formatVal = (v: number | null): string => {
    if (v === null) return "N/A";
    if (decimal) return v.toFixed(1);
    if (isPercent) return `${v}%`;
    return v.toString();
  };

  const aStr = formatVal(valA);
  const bStr = formatVal(valB);

  let deltaStr = "";
  if (valA !== null && valB !== null) {
    const delta = valB - valA;
    if (delta > 0) {
      deltaStr = isPercent
        ? `+${delta}%`
        : decimal
        ? `+${delta.toFixed(1)}`
        : `+${delta}`;
    } else if (delta < 0) {
      deltaStr = isPercent
        ? `${delta}%`
        : decimal
        ? delta.toFixed(1)
        : delta.toString();
    } else {
      deltaStr = "—";
    }
  }

  console.log(
    label.padEnd(col1) +
      aStr.padStart(col2) +
      bStr.padStart(col3) +
      deltaStr.padStart(col4),
  );
}

export const compareCommand: Command<CompareArgs> = {
  name: "compare",
  description: "Compare metrics between blocks",
  usage: "pulse compare <block1> <block2>",
  parseOptions: {
    boolean: ["help"],
    alias: { h: "help" },
  },
  validate,
  run,
};
