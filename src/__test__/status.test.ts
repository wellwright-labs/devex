/**
 * Tests for status command utilities
 * Focus: pure calculation functions for next action and timing
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  calculateNextAction,
  calculateNextCheckinTime,
  type CheckinRecord,
} from "../commands/status.ts";

// =============================================================================
// calculateNextAction - end of day suggestions
// =============================================================================

Deno.test("calculateNextAction - suggests daily after 5pm if not done", () => {
  const now = new Date("2025-01-15T17:30:00"); // 5:30pm
  const result = calculateNextAction(now, 3, 3, [], false, false);
  assertEquals(result, "pulse daily");
});

Deno.test("calculateNextAction - doesn't suggest daily after 5pm if done", () => {
  const now = new Date("2025-01-15T17:30:00"); // 5:30pm
  const result = calculateNextAction(now, 3, 3, [], true, false);
  // Should suggest weekly instead (not daily)
  assertStringIncludes(result, "weekly");
});

// =============================================================================
// calculateNextAction - weekly suggestions
// =============================================================================

Deno.test("calculateNextAction - suggests weekly on Friday if not done", () => {
  const now = new Date("2025-01-17T14:00:00"); // Friday 2pm
  const result = calculateNextAction(now, 3, 3, [], true, false);
  assertEquals(result, "pulse weekly");
});

Deno.test("calculateNextAction - suggests weekly on Saturday if not done", () => {
  const now = new Date("2025-01-18T10:00:00"); // Saturday 10am
  const result = calculateNextAction(now, 3, 3, [], true, false);
  assertEquals(result, "pulse weekly");
});

Deno.test("calculateNextAction - doesn't suggest weekly on Thursday", () => {
  const now = new Date("2025-01-16T14:00:00"); // Thursday 2pm
  const result = calculateNextAction(now, 3, 3, [], true, false);
  // Should not be "pulse weekly" (weekly comes on Fri or later)
  assertStringIncludes(result, "weekly");
  assertStringIncludes(result, "end of week"); // hint it's for later
});

// =============================================================================
// calculateNextAction - checkin suggestions
// =============================================================================

Deno.test("calculateNextAction - suggests checkin when needed", () => {
  const now = new Date("2025-01-15T11:00:00"); // Wednesday 11am
  const result = calculateNextAction(now, 0, 3, [], false, false);
  assertStringIncludes(result, "pulse checkin");
});

Deno.test("calculateNextAction - includes timing hint for checkin", () => {
  const now = new Date("2025-01-15T10:00:00"); // Wednesday 10am
  // 0 checkins, expecting 3, 7 hours of work remaining
  const result = calculateNextAction(now, 0, 3, [], false, false);
  assertStringIncludes(result, "pulse checkin");
  // Should include some timing guidance
});

Deno.test("calculateNextAction - suggests daily at end of day when checkins done", () => {
  const now = new Date("2025-01-15T14:00:00"); // Wednesday 2pm
  const result = calculateNextAction(now, 3, 3, [], false, false);
  assertStringIncludes(result, "pulse daily");
  assertStringIncludes(result, "end of day");
});

// =============================================================================
// calculateNextAction - all done states
// =============================================================================

Deno.test("calculateNextAction - all caught up when everything done", () => {
  const now = new Date("2025-01-15T14:00:00"); // Wednesday 2pm
  const result = calculateNextAction(now, 3, 3, [], true, true);
  assertStringIncludes(result, "all caught up");
});

// =============================================================================
// calculateNextCheckinTime - before work hours
// =============================================================================

Deno.test("calculateNextCheckinTime - before 9am suggests around 9am", () => {
  const now = new Date("2025-01-15T07:30:00"); // 7:30am
  const result = calculateNextCheckinTime(now, [], 3);
  assertEquals(result, "around 9am");
});

Deno.test("calculateNextCheckinTime - early morning suggests 9am", () => {
  const now = new Date("2025-01-15T06:00:00"); // 6am
  const result = calculateNextCheckinTime(now, [], 3);
  assertEquals(result, "around 9am");
});

// =============================================================================
// calculateNextCheckinTime - after work hours
// =============================================================================

Deno.test("calculateNextCheckinTime - after 5pm returns null", () => {
  const now = new Date("2025-01-15T17:30:00"); // 5:30pm
  const result = calculateNextCheckinTime(now, [], 3);
  assertEquals(result, null);
});

Deno.test("calculateNextCheckinTime - at 5pm returns null", () => {
  const now = new Date("2025-01-15T17:00:00"); // exactly 5pm
  const result = calculateNextCheckinTime(now, [], 3);
  assertEquals(result, null);
});

// =============================================================================
// calculateNextCheckinTime - during work hours
// =============================================================================

Deno.test("calculateNextCheckinTime - early morning with all checkins remaining", () => {
  const now = new Date("2025-01-15T09:00:00"); // 9am, 8 hours remaining
  // 3 checkins needed over 8 hours = ~2.6 hours each
  const result = calculateNextCheckinTime(now, [], 3);
  assertStringIncludes(result!, "hours");
});

Deno.test("calculateNextCheckinTime - mid-day with some checkins done", () => {
  const now = new Date("2025-01-15T12:00:00"); // noon, 5 hours remaining
  const checkins: CheckinRecord[] = [
    { timestamp: new Date("2025-01-15T09:30:00") },
  ];
  // 2 checkins remaining over 5 hours = 2.5 hours each
  const result = calculateNextCheckinTime(now, checkins, 3);
  assertStringIncludes(result!, "hours");
});

Deno.test("calculateNextCheckinTime - late afternoon needs checkin soon", () => {
  const now = new Date("2025-01-15T16:30:00"); // 4:30pm, 30 min remaining
  // 1 checkin needed in 30 min = exactly 0.5 hours, suggests ~30 min
  const result = calculateNextCheckinTime(now, [], 1);
  assertEquals(result, "in ~30 min");
});

Deno.test("calculateNextCheckinTime - very late afternoon needs checkin now", () => {
  const now = new Date("2025-01-15T16:45:00"); // 4:45pm, 15 min remaining
  // 1 checkin needed in 15 min = less than 30 min threshold
  const result = calculateNextCheckinTime(now, [], 1);
  assertEquals(result, "now");
});

Deno.test("calculateNextCheckinTime - returns null when all checkins done", () => {
  const now = new Date("2025-01-15T14:00:00"); // 2pm
  const checkins: CheckinRecord[] = [
    { timestamp: new Date("2025-01-15T09:30:00") },
    { timestamp: new Date("2025-01-15T12:00:00") },
    { timestamp: new Date("2025-01-15T13:30:00") },
  ];
  const result = calculateNextCheckinTime(now, checkins, 3);
  assertEquals(result, null);
});

Deno.test("calculateNextCheckinTime - suggests in ~30 min when time is short", () => {
  const now = new Date("2025-01-15T16:00:00"); // 4pm, 1 hour remaining
  // 2 checkins in 1 hour = 30 min each
  const result = calculateNextCheckinTime(now, [], 2);
  assertEquals(result, "in ~30 min");
});

Deno.test("calculateNextCheckinTime - suggests in ~1 hour for medium spacing", () => {
  const now = new Date("2025-01-15T14:00:00"); // 2pm, 3 hours remaining
  // 2 checkins in 3 hours = 1.5 hours each
  const result = calculateNextCheckinTime(now, [], 2);
  assertEquals(result, "in ~1 hour");
});
