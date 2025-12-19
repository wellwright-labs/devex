/**
 * Tests for state utilities
 * Focus: date math functions and block lifecycle
 */

import { assertEquals } from "@std/assert";
import {
  generateBlockId,
  getCurrentBlock,
  getDayInBlock,
  getDaysRemaining,
  isBlockOverdue,
  listBlocksForExperiment,
} from "../lib/state.ts";
import type { Block } from "../types/mod.ts";
import {
  createExperimentStructure,
  createTestEnvironment,
  makeBlock as makeBlockHelper,
  makeExperiment,
} from "./helpers.ts";
import { writeJson } from "../lib/storage.ts";
import { getBlockPath, getExperimentPath } from "../lib/paths.ts";
import { getDefaults, saveGlobalConfig } from "../lib/config.ts";

// Minimal block factory for date math testing
function makeBlock(startDate: Date, expectedDuration = 14): Block {
  return {
    id: "test-1",
    condition: "test",
    tags: [],
    startDate,
    expectedDuration,
  };
}

// =============================================================================
// getDayInBlock - the critical date math
// =============================================================================

Deno.test("getDayInBlock - start date is day 1", () => {
  const start = new Date("2025-01-15T09:00:00");
  const block = makeBlock(start);
  assertEquals(getDayInBlock(block, start), 1);
});

Deno.test("getDayInBlock - next calendar day is day 2", () => {
  const start = new Date("2025-01-15T09:00:00");
  const block = makeBlock(start);
  const nextDay = new Date("2025-01-16T09:00:00");
  assertEquals(getDayInBlock(block, nextDay), 2);
});

Deno.test("getDayInBlock - 14 days later is day 14", () => {
  const start = new Date("2025-01-01T09:00:00");
  const block = makeBlock(start);
  const day14 = new Date("2025-01-14T09:00:00");
  assertEquals(getDayInBlock(block, day14), 14);
});

Deno.test("getDayInBlock - time of day does not matter", () => {
  // Started at 11pm, check at 6am next morning = still day 1
  const start = new Date("2025-01-15T23:00:00");
  const block = makeBlock(start);
  const earlyNextMorning = new Date("2025-01-15T06:00:00");
  assertEquals(getDayInBlock(block, earlyNextMorning), 1);
});

Deno.test("getDayInBlock - late night same calendar day is day 1", () => {
  const start = new Date("2025-01-15T09:00:00");
  const block = makeBlock(start);
  const lateNight = new Date("2025-01-15T23:59:59");
  assertEquals(getDayInBlock(block, lateNight), 1);
});

Deno.test("getDayInBlock - midnight boundary crosses to next day", () => {
  const start = new Date("2025-01-15T09:00:00");
  const block = makeBlock(start);
  const midnight = new Date("2025-01-16T00:00:00");
  assertEquals(getDayInBlock(block, midnight), 2);
});

// =============================================================================
// isBlockOverdue
// =============================================================================

Deno.test("isBlockOverdue - day 14 of 14 is not overdue", () => {
  const start = new Date("2025-01-01T09:00:00");
  const block = makeBlock(start, 14);
  const day14 = new Date("2025-01-14T09:00:00");
  assertEquals(isBlockOverdue(block, day14), false);
});

Deno.test("isBlockOverdue - day 15 of 14 is overdue", () => {
  const start = new Date("2025-01-01T09:00:00");
  const block = makeBlock(start, 14);
  const day15 = new Date("2025-01-15T09:00:00");
  assertEquals(isBlockOverdue(block, day15), true);
});

Deno.test("isBlockOverdue - day 1 is not overdue", () => {
  const start = new Date("2025-01-15T09:00:00");
  const block = makeBlock(start, 14);
  assertEquals(isBlockOverdue(block, start), false);
});

// =============================================================================
// getDaysRemaining
// =============================================================================

Deno.test("getDaysRemaining - day 1 of 14 has 14 remaining", () => {
  const start = new Date("2025-01-15T09:00:00");
  const block = makeBlock(start, 14);
  assertEquals(getDaysRemaining(block, start), 14);
});

Deno.test("getDaysRemaining - day 14 of 14 has 1 remaining", () => {
  const start = new Date("2025-01-01T09:00:00");
  const block = makeBlock(start, 14);
  const day14 = new Date("2025-01-14T09:00:00");
  assertEquals(getDaysRemaining(block, day14), 1);
});

Deno.test("getDaysRemaining - day 15 of 14 has 0 remaining", () => {
  const start = new Date("2025-01-01T09:00:00");
  const block = makeBlock(start, 14);
  const day15 = new Date("2025-01-15T09:00:00");
  assertEquals(getDaysRemaining(block, day15), 0);
});

Deno.test("getDaysRemaining - day 16 of 14 is negative", () => {
  const start = new Date("2025-01-01T09:00:00");
  const block = makeBlock(start, 14);
  const day16 = new Date("2025-01-16T09:00:00");
  assertEquals(getDaysRemaining(block, day16), -1);
});

// =============================================================================
// listBlocksForExperiment - filesystem operations
// =============================================================================

Deno.test("listBlocksForExperiment - empty directory returns empty array", async () => {
  const { dataDir, cleanup } = await createTestEnvironment();
  try {
    await createExperimentStructure(dataDir, "test-exp");
    const blocks = await listBlocksForExperiment("test-exp");
    assertEquals(blocks, []);
  } finally {
    await cleanup();
  }
});

Deno.test("listBlocksForExperiment - returns blocks sorted by date descending", async () => {
  const { dataDir, cleanup } = await createTestEnvironment();
  try {
    await createExperimentStructure(dataDir, "test-exp");

    // Create blocks with different start dates
    const block1 = makeBlockHelper({
      id: "test-1",
      condition: "test",
      startDate: new Date("2025-01-01T09:00:00"),
    });
    const block2 = makeBlockHelper({
      id: "test-2",
      condition: "test",
      startDate: new Date("2025-01-15T09:00:00"),
    });
    const block3 = makeBlockHelper({
      id: "test-3",
      condition: "control",
      startDate: new Date("2025-01-10T09:00:00"),
    });

    await writeJson(getBlockPath("test-exp", "test-1"), block1);
    await writeJson(getBlockPath("test-exp", "test-2"), block2);
    await writeJson(getBlockPath("test-exp", "control-1"), block3);

    const blocks = await listBlocksForExperiment("test-exp");
    assertEquals(blocks.length, 3);
    assertEquals(blocks[0].id, "test-2"); // Most recent first
    assertEquals(blocks[1].id, "test-3");
    assertEquals(blocks[2].id, "test-1"); // Oldest last
  } finally {
    await cleanup();
  }
});

// =============================================================================
// generateBlockId - ID generation
// =============================================================================

Deno.test("generateBlockId - first block for condition gets -1", async () => {
  const { dataDir, cleanup } = await createTestEnvironment();
  try {
    await createExperimentStructure(dataDir, "test-exp");
    const blockId = await generateBlockId("test-exp", "treatment");
    assertEquals(blockId, "treatment-1");
  } finally {
    await cleanup();
  }
});

Deno.test("generateBlockId - increments based on existing blocks", async () => {
  const { dataDir, cleanup } = await createTestEnvironment();
  try {
    await createExperimentStructure(dataDir, "test-exp");

    // Create existing blocks
    const block1 = makeBlockHelper({
      id: "treatment-1",
      condition: "treatment",
    });
    const block2 = makeBlockHelper({
      id: "treatment-2",
      condition: "treatment",
    });
    await writeJson(getBlockPath("test-exp", "treatment-1"), block1);
    await writeJson(getBlockPath("test-exp", "treatment-2"), block2);

    const blockId = await generateBlockId("test-exp", "treatment");
    assertEquals(blockId, "treatment-3");
  } finally {
    await cleanup();
  }
});

Deno.test("generateBlockId - counts only matching condition", async () => {
  const { dataDir, cleanup } = await createTestEnvironment();
  try {
    await createExperimentStructure(dataDir, "test-exp");

    // Create blocks with different conditions
    const block1 = makeBlockHelper({
      id: "treatment-1",
      condition: "treatment",
    });
    const block2 = makeBlockHelper({ id: "control-1", condition: "control" });
    await writeJson(getBlockPath("test-exp", "treatment-1"), block1);
    await writeJson(getBlockPath("test-exp", "control-1"), block2);

    // New control block should be control-2
    const blockId = await generateBlockId("test-exp", "control");
    assertEquals(blockId, "control-2");
  } finally {
    await cleanup();
  }
});

// =============================================================================
// getCurrentBlock - active block detection
// =============================================================================

Deno.test("getCurrentBlock - returns null when no experiment", async () => {
  const { cleanup } = await createTestEnvironment();
  try {
    // No experiment set up - just empty data dir
    const block = await getCurrentBlock();
    assertEquals(block, null);
  } finally {
    await cleanup();
  }
});

Deno.test("getCurrentBlock - returns null when no blocks exist", async () => {
  const { dataDir, cleanup } = await createTestEnvironment();
  try {
    await createExperimentStructure(dataDir, "test-exp");
    const experiment = makeExperiment({ name: "test-exp" });
    await writeJson(getExperimentPath("test-exp"), experiment);
    await saveGlobalConfig({ ...getDefaults(), activeExperiment: "test-exp" });

    const block = await getCurrentBlock();
    assertEquals(block, null);
  } finally {
    await cleanup();
  }
});

Deno.test("getCurrentBlock - returns active block (no endDate)", async () => {
  const { dataDir, cleanup } = await createTestEnvironment();
  try {
    await createExperimentStructure(dataDir, "test-exp");
    const experiment = makeExperiment({ name: "test-exp" });
    await writeJson(getExperimentPath("test-exp"), experiment);
    await saveGlobalConfig({ ...getDefaults(), activeExperiment: "test-exp" });

    // Create one ended block and one active block
    const endedBlock = makeBlockHelper({
      id: "treatment-1",
      condition: "treatment",
      startDate: new Date("2025-01-01T09:00:00"),
      endDate: new Date("2025-01-14T17:00:00"),
    });
    const activeBlock = makeBlockHelper({
      id: "treatment-2",
      condition: "treatment",
      startDate: new Date("2025-01-15T09:00:00"),
    });

    await writeJson(getBlockPath("test-exp", "treatment-1"), endedBlock);
    await writeJson(getBlockPath("test-exp", "treatment-2"), activeBlock);

    const block = await getCurrentBlock();
    assertEquals(block?.id, "treatment-2");
    assertEquals(block?.endDate, undefined);
  } finally {
    await cleanup();
  }
});

Deno.test("getCurrentBlock - returns null when all blocks ended", async () => {
  const { dataDir, cleanup } = await createTestEnvironment();
  try {
    await createExperimentStructure(dataDir, "test-exp");
    const experiment = makeExperiment({ name: "test-exp" });
    await writeJson(getExperimentPath("test-exp"), experiment);
    await saveGlobalConfig({ ...getDefaults(), activeExperiment: "test-exp" });

    // Create only ended blocks
    const endedBlock = makeBlockHelper({
      id: "treatment-1",
      condition: "treatment",
      endDate: new Date("2025-01-14T17:00:00"),
    });

    await writeJson(getBlockPath("test-exp", "treatment-1"), endedBlock);

    const block = await getCurrentBlock();
    assertEquals(block, null);
  } finally {
    await cleanup();
  }
});
