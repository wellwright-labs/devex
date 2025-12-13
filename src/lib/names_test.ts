/**
 * Tests for name normalization utilities
 */

import { assertEquals } from "@std/assert";
import { cleanName, isValidName, normalizeName, sanitizeName } from "./names.ts";

// =============================================================================
// normalizeName tests
// =============================================================================

Deno.test("normalizeName - lowercase", () => {
  assertEquals(normalizeName("MyExperiment"), "myexperiment");
});

Deno.test("normalizeName - spaces to dashes", () => {
  assertEquals(normalizeName("my experiment"), "my-experiment");
});

Deno.test("normalizeName - special chars to dashes", () => {
  assertEquals(normalizeName("test@experiment!"), "test-experiment-");
});

Deno.test("normalizeName - preserves valid chars", () => {
  assertEquals(normalizeName("ai-coding-test-1"), "ai-coding-test-1");
});

Deno.test("normalizeName - already normalized unchanged", () => {
  const name = "my-experiment";
  assertEquals(normalizeName(name), name);
});

// =============================================================================
// isValidName tests
// =============================================================================

Deno.test("isValidName - valid name", () => {
  assertEquals(isValidName("my-experiment"), true);
});

Deno.test("isValidName - empty is invalid", () => {
  assertEquals(isValidName(""), false);
});

Deno.test("isValidName - dash start is invalid", () => {
  assertEquals(isValidName("-experiment"), false);
});

Deno.test("isValidName - dash end is invalid", () => {
  assertEquals(isValidName("experiment-"), false);
});

Deno.test("isValidName - uppercase is invalid", () => {
  assertEquals(isValidName("MyExperiment"), false);
});

Deno.test("isValidName - spaces invalid", () => {
  assertEquals(isValidName("my experiment"), false);
});

Deno.test("isValidName - numbers allowed", () => {
  assertEquals(isValidName("experiment-1"), true);
});

// =============================================================================
// cleanName tests
// =============================================================================

Deno.test("cleanName - removes leading dash", () => {
  assertEquals(cleanName("-experiment"), "experiment");
});

Deno.test("cleanName - removes trailing dash", () => {
  assertEquals(cleanName("experiment-"), "experiment");
});

Deno.test("cleanName - collapses multiple dashes", () => {
  assertEquals(cleanName("my--experiment"), "my-experiment");
});

Deno.test("cleanName - handles complex case", () => {
  assertEquals(cleanName("--my---experiment--"), "my-experiment");
});

// =============================================================================
// sanitizeName tests
// =============================================================================

Deno.test("sanitizeName - full pipeline", () => {
  const result = sanitizeName("My Experiment!");
  assertEquals(result.name, "my-experiment");
  assertEquals(result.wasChanged, true);
  assertEquals(result.isValid, true);
});

Deno.test("sanitizeName - already clean", () => {
  const result = sanitizeName("my-experiment");
  assertEquals(result.name, "my-experiment");
  assertEquals(result.wasChanged, false);
  assertEquals(result.isValid, true);
});

Deno.test("sanitizeName - cleans trailing dashes from special chars", () => {
  const result = sanitizeName("test!");
  assertEquals(result.name, "test");
  assertEquals(result.isValid, true);
});
