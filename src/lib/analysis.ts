/**
 * Analysis and aggregation for Pulse reports
 * Aggregates checkins, daily logs, and violations for block reports
 */

import type {
  Block,
  Checkin,
  CheckinStats,
  DailyCheckins,
  DailyLog,
  DailyStats,
  Violation,
} from "../types/mod.ts";
import { getCheckinsDir, getDailyDir, getViolationsPath } from "./paths.ts";
import { listFiles, readJson } from "./storage.ts";
import { formatDateId } from "./format.ts";

// =============================================================================
// Checkin Aggregation
// =============================================================================

/**
 * Load all checkins for a block's date range
 */
export async function loadCheckinsForBlock(
  experimentName: string,
  block: Block,
): Promise<Checkin[]> {
  const checkinsDir = getCheckinsDir(experimentName);
  const files = await listFiles(checkinsDir);

  const startDateStr = formatDateId(block.startDate);
  const endDate = block.endDate ?? new Date();
  const endDateStr = formatDateId(endDate);

  const checkins: Checkin[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    const dateStr = file.replace(".json", "");

    // Check if date is in range
    if (dateStr >= startDateStr && dateStr <= endDateStr) {
      const dailyCheckins = await readJson<DailyCheckins>(
        `${checkinsDir}/${file}`,
      );
      if (dailyCheckins) {
        // Filter checkins that belong to this block
        const blockCheckins = dailyCheckins.checkins.filter(
          (c) => c.block === block.id,
        );
        checkins.push(...blockCheckins);
      }
    }
  }

  return checkins;
}

/**
 * Aggregate checkin statistics
 */
export function aggregateCheckins(checkins: Checkin[]): CheckinStats {
  if (checkins.length === 0) {
    return {
      count: 0,
      promptedCount: 0,
      avgEnergy: null,
      avgFocus: null,
      stuckPercent: 0,
      avgStuckMinutes: null,
      topWords: [],
    };
  }

  // Count prompted
  const promptedCount = checkins.filter((c) => c.prompted).length;

  // Average energy
  const energyValues = checkins
    .filter((c) => c.energy !== undefined)
    .map((c) => c.energy!);
  const avgEnergy = energyValues.length > 0
    ? energyValues.reduce((a, b) => a + b, 0) / energyValues.length
    : null;

  // Average focus
  const focusValues = checkins
    .filter((c) => c.focus !== undefined)
    .map((c) => c.focus!);
  const avgFocus = focusValues.length > 0
    ? focusValues.reduce((a, b) => a + b, 0) / focusValues.length
    : null;

  // Stuck percentage
  const stuckCount = checkins.filter((c) => c.stuck === true).length;
  const stuckPercent = (stuckCount / checkins.length) * 100;

  // Average stuck minutes (only when stuck)
  const stuckMinutesValues = checkins
    .filter((c) => c.stuckMinutes !== undefined && c.stuckMinutes > 0)
    .map((c) => c.stuckMinutes!);
  const avgStuckMinutes = stuckMinutesValues.length > 0
    ? stuckMinutesValues.reduce((a, b) => a + b, 0) / stuckMinutesValues.length
    : null;

  // Top words from oneWord field
  const topWords = getTopWords(
    checkins.filter((c) => c.oneWord).map((c) => c.oneWord!),
  );

  return {
    count: checkins.length,
    promptedCount,
    avgEnergy: avgEnergy ? Math.round(avgEnergy * 10) / 10 : null,
    avgFocus: avgFocus ? Math.round(avgFocus * 10) / 10 : null,
    stuckPercent: Math.round(stuckPercent),
    avgStuckMinutes: avgStuckMinutes ? Math.round(avgStuckMinutes) : null,
    topWords,
  };
}

// =============================================================================
// Daily Log Aggregation
// =============================================================================

/**
 * Load all daily logs for a block's date range
 */
export async function loadDailyLogsForBlock(
  experimentName: string,
  block: Block,
): Promise<DailyLog[]> {
  const dailyDir = getDailyDir(experimentName);
  const files = await listFiles(dailyDir);

  const startDateStr = formatDateId(block.startDate);
  const endDate = block.endDate ?? new Date();
  const endDateStr = formatDateId(endDate);

  const logs: DailyLog[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    const dateStr = file.replace(".json", "");

    // Check if date is in range
    if (dateStr >= startDateStr && dateStr <= endDateStr) {
      const log = await readJson<DailyLog>(`${dailyDir}/${file}`);
      if (log && log.block === block.id) {
        logs.push(log);
      }
    }
  }

  return logs;
}

/**
 * Aggregate daily log statistics
 */
export function aggregateDailyLogs(logs: DailyLog[]): DailyStats {
  const emptyDistribution = { routine: 0, integrative: 0, creative: 0 };

  if (logs.length === 0) {
    return {
      count: 0,
      avgRatings: {
        confidence: null,
        understanding: null,
        fulfillment: null,
        enjoyment: null,
        cognitiveLoad: null,
      },
      taskTypeDistribution: emptyDistribution,
    };
  }

  // Average ratings
  const avgRatings = {
    confidence: averageRating(logs, (l) => l.ratings?.confidence),
    understanding: averageRating(logs, (l) => l.ratings?.understanding),
    fulfillment: averageRating(logs, (l) => l.ratings?.fulfillment),
    enjoyment: averageRating(logs, (l) => l.ratings?.enjoyment),
    cognitiveLoad: averageRating(logs, (l) => l.ratings?.cognitiveLoad),
  };

  // Task type distribution
  const taskCounts = { routine: 0, integrative: 0, creative: 0 };
  let totalTasks = 0;

  for (const log of logs) {
    if (log.taskTypes) {
      for (const taskType of log.taskTypes) {
        taskCounts[taskType]++;
        totalTasks++;
      }
    }
  }

  const taskTypeDistribution = totalTasks > 0
    ? {
      routine: Math.round((taskCounts.routine / totalTasks) * 100),
      integrative: Math.round((taskCounts.integrative / totalTasks) * 100),
      creative: Math.round((taskCounts.creative / totalTasks) * 100),
    }
    : emptyDistribution;

  return {
    count: logs.length,
    avgRatings,
    taskTypeDistribution,
  };
}

// =============================================================================
// Violations
// =============================================================================

/**
 * Load violations for a specific block
 */
export async function loadViolationsForBlock(
  experimentName: string,
  blockId: string,
): Promise<Violation[]> {
  const violationsPath = getViolationsPath(experimentName);
  const allViolations = await readJson<Violation[]>(violationsPath);

  if (!allViolations) {
    return [];
  }

  return allViolations.filter((v) => v.block === blockId);
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get top N words from a list of strings
 */
function getTopWords(
  words: string[],
  limit: number = 5,
): Array<{ word: string; count: number }> {
  const counts = new Map<string, number>();

  for (const word of words) {
    const normalized = word.toLowerCase().trim();
    if (normalized) {
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Calculate average of a rating field from logs
 */
function averageRating(
  logs: DailyLog[],
  getter: (log: DailyLog) => number | undefined,
): number | null {
  const values = logs.map(getter).filter((v): v is number => v !== undefined);

  if (values.length === 0) {
    return null;
  }

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(avg * 10) / 10;
}
