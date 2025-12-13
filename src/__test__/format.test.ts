/**
 * Tests for format utilities
 * Focus: date formatting that could break
 */

import { assertEquals } from "@std/assert";
import { formatDateId, formatWeekId } from "../lib/format.ts";

// =============================================================================
// formatDateId - used for file names, must be consistent
// =============================================================================

Deno.test("formatDateId - formats as YYYY-MM-DD", () => {
  const date = new Date("2025-01-15T09:00:00");
  assertEquals(formatDateId(date), "2025-01-15");
});

Deno.test("formatDateId - pads single digit month", () => {
  const date = new Date("2025-03-05T09:00:00");
  assertEquals(formatDateId(date), "2025-03-05");
});

Deno.test("formatDateId - pads single digit day", () => {
  const date = new Date("2025-12-01T09:00:00");
  assertEquals(formatDateId(date), "2025-12-01");
});

// =============================================================================
// formatWeekId - ISO week numbers are tricky
// =============================================================================

Deno.test("formatWeekId - mid-year week", () => {
  // June 15, 2025 is week 24
  const date = new Date("2025-06-15T09:00:00");
  assertEquals(formatWeekId(date), "2025-W24");
});

Deno.test("formatWeekId - pads single digit week", () => {
  // Jan 15, 2025 is week 3
  const date = new Date("2025-01-15T09:00:00");
  assertEquals(formatWeekId(date), "2025-W03");
});

Deno.test("formatWeekId - first week of year", () => {
  // Jan 6, 2025 (Monday) is week 2, Jan 1 2025 is week 1
  const date = new Date("2025-01-01T09:00:00");
  assertEquals(formatWeekId(date), "2025-W01");
});

Deno.test("formatWeekId - last week of year", () => {
  // Dec 29, 2025 is week 1 of 2026 (ISO week rule)
  const date = new Date("2025-12-29T09:00:00");
  assertEquals(formatWeekId(date), "2026-W01");
});
