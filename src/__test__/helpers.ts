/**
 * Shared test utilities for Pulse
 * Factory functions and test environment helpers
 */

import { join } from "@std/path";
import type {
  Block,
  Checkin,
  DailyLog,
  Experiment,
  RepoMetrics,
  WeeklyReflection,
} from "../types/mod.ts";

// =============================================================================
// Test Environment
// =============================================================================

/**
 * Create a test environment with temp directory and PULSE_DATA_DIR override
 */
export async function createTestEnvironment(): Promise<{
  dataDir: string;
  cleanup: () => Promise<void>;
}> {
  const dataDir = await Deno.makeTempDir({ prefix: "pulse_test_" });
  const originalDataDir = Deno.env.get("PULSE_DATA_DIR");
  Deno.env.set("PULSE_DATA_DIR", dataDir);

  return {
    dataDir,
    cleanup: async () => {
      if (originalDataDir) {
        Deno.env.set("PULSE_DATA_DIR", originalDataDir);
      } else {
        Deno.env.delete("PULSE_DATA_DIR");
      }
      try {
        await Deno.remove(dataDir, { recursive: true });
      } catch {
        // Ignore cleanup errors
      }
    },
  };
}

/**
 * Create a temp directory for tests (simpler version)
 */
export async function createTempDir(): Promise<string> {
  return await Deno.makeTempDir({ prefix: "pulse_test_" });
}

/**
 * Clean up temp directory
 */
export async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a test block with sensible defaults
 */
export function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: "test-block-1",
    condition: "test",
    tags: [],
    startDate: new Date("2025-01-01T09:00:00"),
    expectedDuration: 14,
    ...overrides,
  };
}

/**
 * Create a test checkin with sensible defaults
 */
export function makeCheckin(overrides: Partial<Checkin> = {}): Checkin {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date("2025-01-15T10:00:00"),
    block: "test-block-1",
    dayInBlock: 1,
    prompted: false,
    ...overrides,
  };
}

/**
 * Create a test daily log with sensible defaults
 */
export function makeDailyLog(overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    date: "2025-01-15",
    block: "test-block-1",
    completedAt: new Date("2025-01-15T18:00:00"),
    ...overrides,
  };
}

/**
 * Create a test weekly reflection with sensible defaults
 */
export function makeWeeklyReflection(
  overrides: Partial<WeeklyReflection> = {},
): WeeklyReflection {
  return {
    week: "2025-W03",
    block: "test-block-1",
    completedAt: new Date("2025-01-19T18:00:00"),
    ...overrides,
  };
}

/**
 * Create a test experiment with sensible defaults
 */
export function makeExperiment(overrides: Partial<Experiment> = {}): Experiment {
  return {
    version: 1,
    name: "test-experiment",
    createdAt: new Date("2025-01-01T09:00:00"),
    hypotheses: ["Test hypothesis"],
    conditions: {
      test: { description: "Test condition" },
    },
    ...overrides,
  };
}

/**
 * Create test repo metrics with sensible defaults
 */
export function makeRepoMetrics(overrides: Partial<RepoMetrics> = {}): RepoMetrics {
  return {
    commits: 10,
    linesAdded: 100,
    linesRemoved: 50,
    filesChanged: 5,
    testFilesChanged: 2,
    docFilesChanged: 1,
    avgCommitsPerDay: 2.5,
    firstCommitTimes: [],
    ...overrides,
  };
}

// =============================================================================
// File System Helpers
// =============================================================================

/**
 * Write JSON to a path, creating parent directories as needed
 */
export async function writeTestJson(
  path: string,
  data: unknown,
): Promise<void> {
  const dir = path.substring(0, path.lastIndexOf("/"));
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(path, JSON.stringify(data, null, 2));
}

/**
 * Create experiment directory structure in a temp dir
 */
export async function createExperimentStructure(
  dataDir: string,
  experimentName: string,
): Promise<void> {
  const expDir = join(dataDir, "experiments", experimentName);
  await Deno.mkdir(join(expDir, "blocks"), { recursive: true });
  await Deno.mkdir(join(expDir, "checkins"), { recursive: true });
  await Deno.mkdir(join(expDir, "daily"), { recursive: true });
  await Deno.mkdir(join(expDir, "weekly"), { recursive: true });
  await Deno.mkdir(join(expDir, "metrics"), { recursive: true });
}
