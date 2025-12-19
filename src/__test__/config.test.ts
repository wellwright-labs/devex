/**
 * Tests for config utilities
 * Focus: mergeConfig handles partial configs correctly
 *
 * Note: We use type casts because mergeConfig must handle partial data
 * from disk where nested objects may be incomplete.
 */

import { assertEquals } from "@std/assert";
import type { GlobalConfig } from "../types/mod.ts";
import { getDefaults, mergeConfig } from "../lib/config.ts";

// =============================================================================
// mergeConfig - partial config handling
// =============================================================================

Deno.test("mergeConfig - empty saved returns defaults", () => {
  const defaults = getDefaults();
  const result = mergeConfig(defaults, {});

  assertEquals(result.version, defaults.version);
  assertEquals(result.activeExperiment, defaults.activeExperiment);
  assertEquals(result.defaults.blockDuration, defaults.defaults.blockDuration);
  assertEquals(result.git.autoCommit, defaults.git.autoCommit);
});

Deno.test("mergeConfig - only activeExperiment set", () => {
  const defaults = getDefaults();
  const result = mergeConfig(defaults, { activeExperiment: "my-experiment" });

  assertEquals(result.activeExperiment, "my-experiment");
  assertEquals(result.defaults.blockDuration, 14);
  assertEquals(result.git.autoCommit, true);
});

Deno.test("mergeConfig - partial nested defaults", () => {
  const defaults = getDefaults();
  // Simulates partial data from disk
  const saved = { defaults: { blockDuration: 7 } } as Partial<GlobalConfig>;
  const result = mergeConfig(defaults, saved);

  assertEquals(result.defaults.blockDuration, 7);
  assertEquals(result.defaults.checkinFrequency, 3);
  assertEquals(result.defaults.checkinPrompts, true);
});

Deno.test("mergeConfig - partial nested git", () => {
  const defaults = getDefaults();
  const saved = { git: { autoCommit: false } } as Partial<GlobalConfig>;
  const result = mergeConfig(defaults, saved);

  assertEquals(result.git.autoCommit, false);
  assertEquals(result.git.commitOnBlockEnd, true);
  assertEquals(result.git.commitOnDailyLog, true);
});

Deno.test("mergeConfig - false values preserved", () => {
  const defaults = getDefaults();
  const saved = {
    defaults: { checkinPrompts: false },
    git: {
      autoCommit: false,
      commitOnBlockEnd: false,
      commitOnDailyLog: false,
    },
  } as Partial<GlobalConfig>;
  const result = mergeConfig(defaults, saved);

  assertEquals(result.defaults.checkinPrompts, false);
  assertEquals(result.git.autoCommit, false);
  assertEquals(result.git.commitOnBlockEnd, false);
  assertEquals(result.git.commitOnDailyLog, false);
});

Deno.test("mergeConfig - zero values preserved", () => {
  const defaults = getDefaults();
  const saved = {
    defaults: { blockDuration: 0, checkinFrequency: 0 },
  } as Partial<GlobalConfig>;
  const result = mergeConfig(defaults, saved);

  assertEquals(result.defaults.blockDuration, 0);
  assertEquals(result.defaults.checkinFrequency, 0);
});

Deno.test("mergeConfig - repositories array replaced", () => {
  const defaults = getDefaults();
  const result = mergeConfig(defaults, {
    repositories: [{ path: "/path/to/repo1" }, { path: "/path/to/repo2" }],
  });

  assertEquals(result.repositories, [
    { path: "/path/to/repo1" },
    { path: "/path/to/repo2" },
  ]);
});

Deno.test("mergeConfig - empty repositories array preserved", () => {
  const defaults = {
    ...getDefaults(),
    repositories: [{ path: "/default/repo" }],
  };
  const result = mergeConfig(defaults, { repositories: [] });

  assertEquals(result.repositories, []);
});

Deno.test("mergeConfig - migrates legacy string repositories", () => {
  const defaults = getDefaults();
  // Simulate old config format with string repositories
  const saved = {
    repositories: ["/path/to/repo1", "/path/to/repo2"],
  } as unknown as Partial<GlobalConfig>;
  const result = mergeConfig(defaults, saved);

  assertEquals(result.repositories, [
    { path: "/path/to/repo1" },
    { path: "/path/to/repo2" },
  ]);
});

Deno.test("mergeConfig - preserves branch in repository objects", () => {
  const defaults = getDefaults();
  const result = mergeConfig(defaults, {
    repositories: [
      { path: "/path/to/repo1", branch: "main" },
      { path: "/path/to/repo2" },
    ],
  });

  assertEquals(result.repositories, [
    { path: "/path/to/repo1", branch: "main" },
    { path: "/path/to/repo2" },
  ]);
});
