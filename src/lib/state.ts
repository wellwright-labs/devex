/**
 * State management for Devex
 * Resolves current experiment and block from config and data files
 */

import type { Block, Experiment } from "../types/mod.ts";
import { getConfig } from "./config.ts";
import {
  getBlockPath,
  getBlocksDir,
  getExperimentPath,
  getExperimentsDir,
} from "./paths.ts";
import { listDirs, listFiles, readJson } from "./storage.ts";

/**
 * Error thrown when an operation requires an active experiment but none exists
 */
export class NoExperimentError extends Error {
  constructor() {
    super("No active experiment. Create one with: devex init");
    this.name = "NoExperimentError";
  }
}

/**
 * Error thrown when an operation requires an active block but none exists
 */
export class NoBlockError extends Error {
  constructor(conditions: string[]) {
    const conditionList = conditions.length > 0
      ? `\n\nAvailable conditions: ${conditions.join(", ")}`
      : "";
    super(
      `No active block. Start one with: devex block start <condition>${conditionList}`,
    );
    this.name = "NoBlockError";
  }
}

/**
 * Get the current experiment based on config's activeExperiment
 * Returns null if no experiment is active or it doesn't exist
 */
export async function getCurrentExperiment(): Promise<Experiment | null> {
  const config = await getConfig();
  if (!config.activeExperiment) {
    return null;
  }
  return await loadExperiment(config.activeExperiment);
}

/**
 * Get the current experiment, throwing if none is active
 */
export async function requireExperiment(): Promise<Experiment> {
  const experiment = await getCurrentExperiment();
  if (!experiment) {
    throw new NoExperimentError();
  }
  return experiment;
}

/**
 * Load an experiment by name
 * Returns null if experiment doesn't exist
 */
export async function loadExperiment(name: string): Promise<Experiment | null> {
  return await readJson<Experiment>(getExperimentPath(name));
}

/**
 * Get all experiment names
 */
export async function listExperiments(): Promise<string[]> {
  return await listDirs(getExperimentsDir());
}

/**
 * Get the active block for the current experiment
 * Returns null if no block is active (no endDate means active)
 */
export async function getCurrentBlock(): Promise<Block | null> {
  const experiment = await getCurrentExperiment();
  if (!experiment) {
    return null;
  }

  const blocks = await listBlocksForExperiment(experiment.name);
  for (const block of blocks) {
    if (!block.endDate) {
      return block;
    }
  }
  return null;
}

/**
 * Get the current block, throwing if none is active
 */
export async function requireBlock(): Promise<Block> {
  const experiment = await getCurrentExperiment();
  if (!experiment) {
    throw new NoExperimentError();
  }

  const block = await getCurrentBlock();
  if (!block) {
    throw new NoBlockError(Object.keys(experiment.conditions));
  }
  return block;
}

/**
 * Load a specific block by ID for the current experiment
 */
export async function loadBlock(blockId: string): Promise<Block | null> {
  const experiment = await getCurrentExperiment();
  if (!experiment) {
    return null;
  }
  return await readJson<Block>(getBlockPath(experiment.name, blockId));
}

/**
 * List all blocks for an experiment
 */
export async function listBlocksForExperiment(
  experimentName: string,
): Promise<Block[]> {
  const files = await listFiles(getBlocksDir(experimentName));
  const blocks: Block[] = [];

  for (const file of files) {
    if (file.endsWith(".json")) {
      const blockId = file.replace(".json", "");
      const block = await readJson<Block>(
        getBlockPath(experimentName, blockId),
      );
      if (block) {
        blocks.push(block);
      }
    }
  }

  // Sort by start date, most recent first
  return blocks.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
}

/**
 * Generate the next block ID for a condition
 * Format: <condition>-<n> where n is incremented
 */
export async function generateBlockId(
  experimentName: string,
  condition: string,
): Promise<string> {
  const blocks = await listBlocksForExperiment(experimentName);
  const conditionBlocks = blocks.filter((b) => b.condition === condition);
  const nextNum = conditionBlocks.length + 1;
  return `${condition}-${nextNum}`;
}

/**
 * Calculate the day number within a block (1-indexed)
 */
export function getDayInBlock(block: Block, date: Date = new Date()): number {
  const startOfDay = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };

  const start = startOfDay(block.startDate);
  const current = startOfDay(date);
  const diffMs = current.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays + 1; // 1-indexed
}

/**
 * Check if a block has exceeded its expected duration
 */
export function isBlockOverdue(block: Block, date: Date = new Date()): boolean {
  const dayInBlock = getDayInBlock(block, date);
  return dayInBlock > block.expectedDuration;
}

/**
 * Get days remaining in a block (can be negative if overdue)
 */
export function getDaysRemaining(
  block: Block,
  date: Date = new Date(),
): number {
  const dayInBlock = getDayInBlock(block, date);
  return block.expectedDuration - dayInBlock + 1;
}
