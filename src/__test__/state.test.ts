/**
 * Tests for state utilities
 * Focus: date math functions that could break
 */

import { assertEquals } from "@std/assert";
import { getDayInBlock, getDaysRemaining, isBlockOverdue } from "../lib/state.ts";
import type { Block } from "../types/mod.ts";

// Minimal block factory for testing
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
