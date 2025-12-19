/**
 * Tests for path utilities
 * Focus: path construction with DEVEX_DATA_DIR override (Devex)
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  getBlockPath,
  getBlocksDir,
  getCheckinsDir,
  getCheckinsPath,
  getConfigPath,
  getDailyDir,
  getDailyPath,
  getDataDir,
  getDevLogPath,
  getExperimentDir,
  getExperimentPath,
  getExperimentsDir,
  getExperimentSubdirs,
  getInitialDirs,
  getMetricsDir,
  getMetricsPath,
  getTemplatePath,
  getTemplatesDir,
  getWeeklyDir,
  getWeeklyPath,
} from "../lib/paths.ts";

// =============================================================================
// getDataDir - override behavior
// =============================================================================

Deno.test("getDataDir - uses DEVEX_DATA_DIR when set", () => {
  const original = Deno.env.get("DEVEX_DATA_DIR");
  try {
    Deno.env.set("DEVEX_DATA_DIR", "/custom/path");
    assertEquals(getDataDir(), "/custom/path");
  } finally {
    if (original) {
      Deno.env.set("DEVEX_DATA_DIR", original);
    } else {
      Deno.env.delete("DEVEX_DATA_DIR");
    }
  }
});

Deno.test("getDataDir - defaults to ~/.config/devex", () => {
  const original = Deno.env.get("DEVEX_DATA_DIR");
  try {
    Deno.env.delete("DEVEX_DATA_DIR");
    const home = Deno.env.get("HOME");
    assertEquals(getDataDir(), `${home}/.config/devex`);
  } finally {
    if (original) {
      Deno.env.set("DEVEX_DATA_DIR", original);
    }
  }
});

// =============================================================================
// Config and top-level paths
// =============================================================================

Deno.test("getConfigPath - returns config.json in data dir", () => {
  const original = Deno.env.get("DEVEX_DATA_DIR");
  try {
    Deno.env.set("DEVEX_DATA_DIR", "/test");
    assertEquals(getConfigPath(), "/test/config.json");
  } finally {
    if (original) {
      Deno.env.set("DEVEX_DATA_DIR", original);
    } else {
      Deno.env.delete("DEVEX_DATA_DIR");
    }
  }
});

Deno.test("getExperimentsDir - returns experiments subdirectory", () => {
  const original = Deno.env.get("DEVEX_DATA_DIR");
  try {
    Deno.env.set("DEVEX_DATA_DIR", "/test");
    assertEquals(getExperimentsDir(), "/test/experiments");
  } finally {
    if (original) {
      Deno.env.set("DEVEX_DATA_DIR", original);
    } else {
      Deno.env.delete("DEVEX_DATA_DIR");
    }
  }
});

Deno.test("getTemplatesDir - returns templates subdirectory", () => {
  const original = Deno.env.get("DEVEX_DATA_DIR");
  try {
    Deno.env.set("DEVEX_DATA_DIR", "/test");
    assertEquals(getTemplatesDir(), "/test/templates");
  } finally {
    if (original) {
      Deno.env.set("DEVEX_DATA_DIR", original);
    } else {
      Deno.env.delete("DEVEX_DATA_DIR");
    }
  }
});

Deno.test("getTemplatePath - returns template json path", () => {
  const original = Deno.env.get("DEVEX_DATA_DIR");
  try {
    Deno.env.set("DEVEX_DATA_DIR", "/test");
    assertEquals(
      getTemplatePath("my-template"),
      "/test/templates/my-template.json",
    );
  } finally {
    if (original) {
      Deno.env.set("DEVEX_DATA_DIR", original);
    } else {
      Deno.env.delete("DEVEX_DATA_DIR");
    }
  }
});

// =============================================================================
// Experiment paths
// =============================================================================

Deno.test("getExperimentDir - returns experiment subdirectory", () => {
  const original = Deno.env.get("DEVEX_DATA_DIR");
  try {
    Deno.env.set("DEVEX_DATA_DIR", "/test");
    assertEquals(getExperimentDir("my-exp"), "/test/experiments/my-exp");
  } finally {
    if (original) {
      Deno.env.set("DEVEX_DATA_DIR", original);
    } else {
      Deno.env.delete("DEVEX_DATA_DIR");
    }
  }
});

Deno.test("getExperimentPath - returns experiment.json path", () => {
  const original = Deno.env.get("DEVEX_DATA_DIR");
  try {
    Deno.env.set("DEVEX_DATA_DIR", "/test");
    assertEquals(
      getExperimentPath("my-exp"),
      "/test/experiments/my-exp/experiment.json",
    );
  } finally {
    if (original) {
      Deno.env.set("DEVEX_DATA_DIR", original);
    } else {
      Deno.env.delete("DEVEX_DATA_DIR");
    }
  }
});

// =============================================================================
// Block paths
// =============================================================================

Deno.test("getBlocksDir - returns blocks subdirectory", () => {
  const original = Deno.env.get("DEVEX_DATA_DIR");
  try {
    Deno.env.set("DEVEX_DATA_DIR", "/test");
    assertEquals(getBlocksDir("my-exp"), "/test/experiments/my-exp/blocks");
  } finally {
    if (original) {
      Deno.env.set("DEVEX_DATA_DIR", original);
    } else {
      Deno.env.delete("DEVEX_DATA_DIR");
    }
  }
});

Deno.test("getBlockPath - returns block json path with id", () => {
  const original = Deno.env.get("DEVEX_DATA_DIR");
  try {
    Deno.env.set("DEVEX_DATA_DIR", "/test");
    assertEquals(
      getBlockPath("my-exp", "block-001"),
      "/test/experiments/my-exp/blocks/block-001.json",
    );
  } finally {
    if (original) {
      Deno.env.set("DEVEX_DATA_DIR", original);
    } else {
      Deno.env.delete("DEVEX_DATA_DIR");
    }
  }
});

// =============================================================================
// Checkin paths
// =============================================================================

Deno.test("getCheckinsDir - returns checkins subdirectory", () => {
  const original = Deno.env.get("DEVEX_DATA_DIR");
  try {
    Deno.env.set("DEVEX_DATA_DIR", "/test");
    assertEquals(getCheckinsDir("my-exp"), "/test/experiments/my-exp/checkins");
  } finally {
    if (original) {
      Deno.env.set("DEVEX_DATA_DIR", original);
    } else {
      Deno.env.delete("DEVEX_DATA_DIR");
    }
  }
});

Deno.test("getCheckinsPath - returns date-based checkins file", () => {
  const original = Deno.env.get("DEVEX_DATA_DIR");
  try {
    Deno.env.set("DEVEX_DATA_DIR", "/test");
    assertEquals(
      getCheckinsPath("my-exp", "2025-01-15"),
      "/test/experiments/my-exp/checkins/2025-01-15.json",
    );
  } finally {
    if (original) {
      Deno.env.set("DEVEX_DATA_DIR", original);
    } else {
      Deno.env.delete("DEVEX_DATA_DIR");
    }
  }
});

// =============================================================================
// Daily paths
// =============================================================================

Deno.test("getDailyDir - returns daily subdirectory", () => {
  const original = Deno.env.get("DEVEX_DATA_DIR");
  try {
    Deno.env.set("DEVEX_DATA_DIR", "/test");
    assertEquals(getDailyDir("my-exp"), "/test/experiments/my-exp/daily");
  } finally {
    if (original) {
      Deno.env.set("DEVEX_DATA_DIR", original);
    } else {
      Deno.env.delete("DEVEX_DATA_DIR");
    }
  }
});

Deno.test("getDailyPath - returns date-based daily file", () => {
  const original = Deno.env.get("DEVEX_DATA_DIR");
  try {
    Deno.env.set("DEVEX_DATA_DIR", "/test");
    assertEquals(
      getDailyPath("my-exp", "2025-01-15"),
      "/test/experiments/my-exp/daily/2025-01-15.json",
    );
  } finally {
    if (original) {
      Deno.env.set("DEVEX_DATA_DIR", original);
    } else {
      Deno.env.delete("DEVEX_DATA_DIR");
    }
  }
});

// =============================================================================
// Weekly paths
// =============================================================================

Deno.test("getWeeklyDir - returns weekly subdirectory", () => {
  const original = Deno.env.get("DEVEX_DATA_DIR");
  try {
    Deno.env.set("DEVEX_DATA_DIR", "/test");
    assertEquals(getWeeklyDir("my-exp"), "/test/experiments/my-exp/weekly");
  } finally {
    if (original) {
      Deno.env.set("DEVEX_DATA_DIR", original);
    } else {
      Deno.env.delete("DEVEX_DATA_DIR");
    }
  }
});

Deno.test("getWeeklyPath - returns week-based weekly file", () => {
  const original = Deno.env.get("DEVEX_DATA_DIR");
  try {
    Deno.env.set("DEVEX_DATA_DIR", "/test");
    assertEquals(
      getWeeklyPath("my-exp", "2025-W03"),
      "/test/experiments/my-exp/weekly/2025-W03.json",
    );
  } finally {
    if (original) {
      Deno.env.set("DEVEX_DATA_DIR", original);
    } else {
      Deno.env.delete("DEVEX_DATA_DIR");
    }
  }
});

// =============================================================================
// Other experiment files
// =============================================================================

Deno.test("getDevLogPath - returns devlog.md path", () => {
  const original = Deno.env.get("DEVEX_DATA_DIR");
  try {
    Deno.env.set("DEVEX_DATA_DIR", "/test");
    assertEquals(getDevLogPath("my-exp"), "/test/experiments/my-exp/devlog.md");
  } finally {
    if (original) {
      Deno.env.set("DEVEX_DATA_DIR", original);
    } else {
      Deno.env.delete("DEVEX_DATA_DIR");
    }
  }
});

// =============================================================================
// Metrics paths
// =============================================================================

Deno.test("getMetricsDir - returns metrics subdirectory", () => {
  const original = Deno.env.get("DEVEX_DATA_DIR");
  try {
    Deno.env.set("DEVEX_DATA_DIR", "/test");
    assertEquals(getMetricsDir("my-exp"), "/test/experiments/my-exp/metrics");
  } finally {
    if (original) {
      Deno.env.set("DEVEX_DATA_DIR", original);
    } else {
      Deno.env.delete("DEVEX_DATA_DIR");
    }
  }
});

Deno.test("getMetricsPath - returns block-based metrics file", () => {
  const original = Deno.env.get("DEVEX_DATA_DIR");
  try {
    Deno.env.set("DEVEX_DATA_DIR", "/test");
    assertEquals(
      getMetricsPath("my-exp", "block-001"),
      "/test/experiments/my-exp/metrics/block-001.json",
    );
  } finally {
    if (original) {
      Deno.env.set("DEVEX_DATA_DIR", original);
    } else {
      Deno.env.delete("DEVEX_DATA_DIR");
    }
  }
});

// =============================================================================
// Directory lists
// =============================================================================

Deno.test("getExperimentSubdirs - returns all experiment subdirs", () => {
  const original = Deno.env.get("DEVEX_DATA_DIR");
  try {
    Deno.env.set("DEVEX_DATA_DIR", "/test");
    const subdirs = getExperimentSubdirs("my-exp");
    assertEquals(subdirs.length, 5);
    assertStringIncludes(subdirs[0], "blocks");
    assertStringIncludes(subdirs[1], "checkins");
    assertStringIncludes(subdirs[2], "daily");
    assertStringIncludes(subdirs[3], "weekly");
    assertStringIncludes(subdirs[4], "metrics");
  } finally {
    if (original) {
      Deno.env.set("DEVEX_DATA_DIR", original);
    } else {
      Deno.env.delete("DEVEX_DATA_DIR");
    }
  }
});

Deno.test("getInitialDirs - returns base directories", () => {
  const original = Deno.env.get("DEVEX_DATA_DIR");
  try {
    Deno.env.set("DEVEX_DATA_DIR", "/test");
    const dirs = getInitialDirs();
    assertEquals(dirs.length, 3);
    assertEquals(dirs[0], "/test");
    assertEquals(dirs[1], "/test/experiments");
    assertEquals(dirs[2], "/test/templates");
  } finally {
    if (original) {
      Deno.env.set("DEVEX_DATA_DIR", original);
    } else {
      Deno.env.delete("DEVEX_DATA_DIR");
    }
  }
});
