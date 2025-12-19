/**
 * pulse block command
 * Manages work blocks: start, end, status, list, extend
 */

import type { Args } from "@std/cli/parse-args";
import type { Block, Condition } from "../types/mod.ts";
import type { BlockArgs, Command } from "../types/commands.ts";
import { getConfig } from "../lib/config.ts";
import { getBlockPath } from "../lib/paths.ts";
import { writeJson } from "../lib/storage.ts";
import {
  generateBlockId,
  getCurrentBlock,
  getDayInBlock,
  getDaysRemaining,
  isBlockOverdue,
  listBlocksForExperiment,
  requireExperiment,
} from "../lib/state.ts";
import { promptText } from "../lib/prompts.ts";
import { sanitizeName } from "../lib/names.ts";
import {
  dim,
  error,
  formatBlockStatus,
  formatDate,
  info,
  printTable,
  success,
  warn,
} from "../lib/format.ts";
import { autoCommit } from "../lib/git.ts";

function validate(args: Args): BlockArgs {
  const subcommand = args._[1]?.toString() as BlockArgs["subcommand"];
  const tagsArg = (args.tags as string) || (args.t as string);
  const positionalArg = args._[2]?.toString();

  return {
    subcommand,
    // positionalArg is condition for "start", days for "extend"
    condition: positionalArg,
    days: positionalArg ? parseInt(positionalArg, 10) : undefined,
    duration: (args.duration as number) || (args.d as number),
    tags: tagsArg ? tagsArg.split(",").map((t) => t.trim()) : undefined,
    help: Boolean(args.help || args.h),
  };
}

function showHelp(): void {
  console.log(`
Usage: pulse block <subcommand> [options]

Manage work blocks.

Subcommands:
  start <condition>   Start a new block under specified condition
  end                 End the current block
  status              Show current block status
  list                List all blocks
  extend <days>       Extend current block duration

Options:
  --duration, -d      Block duration in days (default: 14)
  --tags, -t          Comma-separated tags
  --help, -h          Show this help

Examples:
  pulse block start no-ai
  pulse block start full-ai --duration 7 --tags "sprint-1,focused"
  pulse block end
  pulse block status
  pulse block extend 3
`);
}

async function run(args: BlockArgs): Promise<void> {
  if (args.help || !args.subcommand) {
    showHelp();
    return;
  }

  switch (args.subcommand) {
    case "start":
      await blockStart(args);
      break;
    case "end":
      await blockEnd();
      break;
    case "status":
      await blockStatus();
      break;
    case "list":
      await blockList();
      break;
    case "extend":
      await blockExtend(args);
      break;
    default:
      error(`Unknown subcommand: ${args.subcommand}`);
      showHelp();
  }
}

async function blockStart(args: BlockArgs): Promise<void> {
  const experiment = await requireExperiment();

  // Check for existing active block
  const currentBlock = await getCurrentBlock();
  if (currentBlock) {
    error(`A block is already active: ${currentBlock.id}`);
    info("End it first with: pulse block end");
    Deno.exit(1);
  }

  // Validate condition
  if (!args.condition) {
    error("Condition required.");
    console.log(
      `\nAvailable conditions: ${
        Object.keys(experiment.conditions).join(", ")
      }`,
    );
    Deno.exit(1);
  }

  const { name: condition, wasChanged } = sanitizeName(args.condition);
  if (wasChanged) {
    info(`Using normalized condition: ${condition}`);
  }

  if (!experiment.conditions[condition]) {
    error(`Unknown condition: ${condition}`);
    console.log(
      `\nAvailable conditions: ${
        Object.keys(experiment.conditions).join(", ")
      }`,
    );
    Deno.exit(1);
  }

  // Get duration and tags
  const config = await getConfig();
  const duration = args.duration || config.defaults.blockDuration;
  const tags = args.tags || [];

  // Generate block ID
  const blockId = await generateBlockId(experiment.name, condition);

  // Show condition details
  const conditionDef = experiment.conditions[condition];
  printConditionDetails(condition, conditionDef);

  // Create block
  const block: Block = {
    id: blockId,
    condition,
    tags,
    startDate: new Date(),
    expectedDuration: duration,
  };

  // Save block
  const blockPath = getBlockPath(experiment.name, blockId);
  await writeJson(blockPath, block);

  success(`Started block: ${blockId}`);
  console.log(`  Duration: ${duration} days`);
  if (tags.length > 0) {
    console.log(`  Tags: ${tags.join(", ")}`);
  }
  console.log("");
  dim("Next: pulse checkin | pulse log <note>");
}

async function blockEnd(): Promise<void> {
  const experiment = await requireExperiment();
  const block = await getCurrentBlock();

  if (!block) {
    error("No active block to end.");
    Deno.exit(1);
  }

  console.log("");
  console.log(
    formatBlockStatus(
      block.condition,
      getDayInBlock(block),
      block.expectedDuration,
    ),
  );
  console.log("");

  // Prompt for summary
  console.log("Block summary:");
  const description = await promptText("How would you describe this block?");
  const surprises = await promptText("What surprised you?");
  const confirmedExpectations = await promptText(
    "What confirmed your expectations?",
  );

  // Update block
  block.endDate = new Date();
  block.summary = {
    description,
    surprises,
    confirmedExpectations,
    completedAt: new Date(),
  };

  // Save
  const blockPath = getBlockPath(experiment.name, block.id);
  await writeJson(blockPath, block);

  // Auto-commit if enabled
  const config = await getConfig();
  if (config.git.autoCommit && config.git.commitOnBlockEnd) {
    await autoCommit(`Block ended: ${block.id}`);
  }

  console.log("");
  success(`Ended block: ${block.id}`);
  console.log(`  Duration: ${getDayInBlock(block)} days`);
  console.log("");
  dim("Next: pulse report | pulse block start <condition>");
}

async function blockStatus(): Promise<void> {
  const experiment = await requireExperiment();
  const block = await getCurrentBlock();

  if (!block) {
    info("No active block.");
    console.log(`\nStart one with: pulse block start <condition>`);
    console.log(
      `Available conditions: ${Object.keys(experiment.conditions).join(", ")}`,
    );
    return;
  }

  const dayInBlock = getDayInBlock(block);
  const daysRemaining = getDaysRemaining(block);
  const overdue = isBlockOverdue(block);

  console.log("");
  console.log(
    formatBlockStatus(block.condition, dayInBlock, block.expectedDuration),
  );
  console.log("");
  console.log(`  Block: ${block.id}`);
  console.log(`  Started: ${formatDate(block.startDate)}`);
  console.log(`  Day: ${dayInBlock} of ${block.expectedDuration}`);

  if (overdue) {
    warn(`  ${Math.abs(daysRemaining)} days over expected duration`);
  } else {
    console.log(`  Remaining: ${daysRemaining} days`);
  }

  if (block.tags.length > 0) {
    console.log(`  Tags: ${block.tags.join(", ")}`);
  }

  // Show condition rules
  const condition = experiment.conditions[block.condition];
  if (condition) {
    console.log("");
    dim(`  ${condition.description}`);
    if (condition.forbidden && condition.forbidden.length > 0) {
      dim(`  Forbidden: ${condition.forbidden.join(", ")}`);
    }
  }

  console.log("");
}

async function blockList(): Promise<void> {
  const experiment = await requireExperiment();
  const blocks = await listBlocksForExperiment(experiment.name);

  if (blocks.length === 0) {
    info("No blocks yet.");
    console.log(`\nStart one with: pulse block start <condition>`);
    return;
  }

  console.log("");
  const headers = ["Block", "Condition", "Started", "Days", "Status"];
  const rows = blocks.map((block) => {
    const endOrNow = block.endDate ?? new Date();
    const days = getDayInBlock(block, endOrNow).toString();
    const status = block.endDate ? "completed" : "active";
    return [
      block.id,
      block.condition,
      formatDate(block.startDate),
      days,
      status,
    ];
  });

  printTable(headers, rows);
  console.log("");
}

async function blockExtend(args: BlockArgs): Promise<void> {
  const experiment = await requireExperiment();
  const block = await getCurrentBlock();

  if (!block) {
    error("No active block to extend.");
    Deno.exit(1);
  }

  const days = args.days;
  if (!days || isNaN(days) || days <= 0) {
    error("Please specify a positive number of days to extend.");
    console.log("\nUsage: pulse block extend <days>");
    Deno.exit(1);
  }

  const oldDuration = block.expectedDuration;
  block.expectedDuration += days;

  const blockPath = getBlockPath(experiment.name, block.id);
  await writeJson(blockPath, block);

  success(`Extended block by ${days} days`);
  console.log(
    `  New duration: ${block.expectedDuration} days (was ${oldDuration})`,
  );
}

function printConditionDetails(name: string, condition: Condition): void {
  console.log("");
  console.log(`Condition: ${name}`);
  console.log(`  ${condition.description}`);

  if (condition.allowed && condition.allowed.length > 0) {
    console.log(`  Allowed: ${condition.allowed.join(", ")}`);
  }
  if (condition.forbidden && condition.forbidden.length > 0) {
    console.log(`  Forbidden: ${condition.forbidden.join(", ")}`);
  }
  if (condition.notes) {
    console.log(`  Notes: ${condition.notes}`);
  }
  console.log("");
}

export const blockCommand: Command<BlockArgs> = {
  name: "block",
  description: "Manage work blocks",
  usage: "pulse block <start|end|status|list|extend> [options]",
  parseOptions: {
    string: ["tags"],
    boolean: ["help"],
    alias: { d: "duration", t: "tags", h: "help" },
  },
  validate,
  run,
};
