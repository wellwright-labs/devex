/**
 * pulse metrics command
 * Compute and display git metrics for a block
 */

import type { Args } from "@std/cli/parse-args";
import type { Command, MetricsArgs } from "../types/commands.ts";
import type { GitMetrics } from "../types/mod.ts";
import { getConfig } from "../lib/config.ts";
import { getMetricsPath } from "../lib/paths.ts";
import { readJson, writeJson } from "../lib/storage.ts";
import { getCurrentBlock, loadBlock, requireExperiment } from "../lib/state.ts";
import { computeGitMetrics } from "../lib/metrics.ts";
import { dim, error, formatDate, info, success } from "../lib/format.ts";

function validate(args: Args): MetricsArgs {
  return {
    block: (args.block as string) || (args.b as string),
    refresh: Boolean(args.refresh),
    help: Boolean(args.help || args.h),
  };
}

function showHelp(): void {
  console.log(`
Usage: pulse metrics [options]

Compute and display git metrics for a block.

Options:
  --block, -b <id>   Block to compute metrics for (default: current)
  --refresh          Force recompute (ignore cache)
  --help, -h         Show this help

Examples:
  pulse metrics
  pulse metrics --block no-ai-1
  pulse metrics --refresh
`);
}

async function run(args: MetricsArgs): Promise<void> {
  if (args.help) {
    showHelp();
    return;
  }

  const experiment = await requireExperiment();
  const config = await getConfig();

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

  // Check for configured repositories
  if (config.repositories.length === 0) {
    error("No repositories configured.");
    info("Add repositories with: pulse config add repos <path>");
    console.log("\nSupported formats:");
    console.log("  Local:  /path/to/repo, ~/repo");
    console.log("  GitHub: owner/repo, https://github.com/owner/repo");
    Deno.exit(1);
  }

  // Check for cached metrics
  const metricsPath = getMetricsPath(experiment.name, block.id);
  let metrics: GitMetrics | null = null;

  if (!args.refresh) {
    metrics = await readJson<GitMetrics>(metricsPath);
    if (metrics) {
      info("Using cached metrics (use --refresh to recompute)");
    }
  }

  // Compute if needed
  if (!metrics) {
    console.log("Computing git metrics...");
    console.log("");

    try {
      metrics = await computeGitMetrics(block, config.repositories);
      await writeJson(metricsPath, metrics);
      success("Metrics computed and cached");
    } catch (err) {
      error(`Failed to compute metrics: ${err}`);
      Deno.exit(1);
    }
  }

  // Display metrics
  console.log("");
  displayMetrics(metrics);
}

function displayMetrics(metrics: GitMetrics): void {
  const { totals, dateRange } = metrics;

  console.log(
    `Git Metrics: ${metrics.block} (${formatDate(dateRange.start)} - ${
      formatDate(dateRange.end)
    })`,
  );
  console.log("─".repeat(50));
  console.log("");

  console.log(`  Commits:           ${totals.commits}`);
  console.log(
    `  Lines added:       +${totals.linesAdded.toLocaleString()}`,
  );
  console.log(
    `  Lines removed:     -${totals.linesRemoved.toLocaleString()}`,
  );
  console.log(`  Files changed:     ${totals.filesChanged}`);
  console.log(`  Test files:        ${totals.testFilesChanged}`);
  console.log(`  Doc files:         ${totals.docFilesChanged}`);
  console.log(
    `  Avg commits/day:   ${totals.avgCommitsPerDay.toFixed(1)}`,
  );

  // Per-repo breakdown if multiple repos
  const repoNames = Object.keys(metrics.repositories);
  if (repoNames.length > 1) {
    console.log("");
    console.log("Per Repository:");
    for (const repo of repoNames) {
      const repoMetrics = metrics.repositories[repo];
      dim(
        `  ${repo}: ${repoMetrics.commits} commits, +${repoMetrics.linesAdded}/-${repoMetrics.linesRemoved}`,
      );
    }
  }

  console.log("");
}

export const metricsCommand: Command<MetricsArgs> = {
  name: "metrics",
  description: "Compute and display git metrics",
  usage: "pulse metrics [--block <id>] [--refresh]",
  parseOptions: {
    string: ["block"],
    boolean: ["help", "refresh"],
    alias: { b: "block", h: "help" },
  },
  validate,
  run,
};
