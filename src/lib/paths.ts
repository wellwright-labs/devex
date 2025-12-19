/**
 * Path utilities for Devex data directory
 * All paths are absolute and resolve to ~/.config/devex by default
 */

import { join } from "@std/path";

/**
 * Get the Devex data directory
 * Default: ~/.config/devex
 * Can be overridden with DEVEX_DATA_DIR environment variable
 */
export function getDataDir(): string {
  const override = Deno.env.get("DEVEX_DATA_DIR");
  if (override) {
    return override;
  }

  const home = Deno.env.get("HOME");
  if (!home) {
    throw new Error(
      "Cannot determine home directory: HOME environment variable not set",
    );
  }

  return join(home, ".config", "devex");
}

/**
 * Get path to global config file
 */
export function getConfigPath(): string {
  return join(getDataDir(), "config.json");
}

/**
 * Get path to experiments directory
 */
export function getExperimentsDir(): string {
  return join(getDataDir(), "experiments");
}

/**
 * Get path to a specific experiment directory
 */
export function getExperimentDir(name: string): string {
  return join(getExperimentsDir(), name);
}

/**
 * Get path to experiment definition file
 */
export function getExperimentPath(name: string): string {
  return join(getExperimentDir(name), "experiment.json");
}

/**
 * Get path to blocks directory for an experiment
 */
export function getBlocksDir(experimentName: string): string {
  return join(getExperimentDir(experimentName), "blocks");
}

/**
 * Get path to a specific block file
 */
export function getBlockPath(experimentName: string, blockId: string): string {
  return join(getBlocksDir(experimentName), `${blockId}.json`);
}

/**
 * Get path to checkins directory for an experiment
 */
export function getCheckinsDir(experimentName: string): string {
  return join(getExperimentDir(experimentName), "checkins");
}

/**
 * Get path to checkins file for a specific date
 */
export function getCheckinsPath(experimentName: string, date: string): string {
  return join(getCheckinsDir(experimentName), `${date}.json`);
}

/**
 * Get path to daily logs directory for an experiment
 */
export function getDailyDir(experimentName: string): string {
  return join(getExperimentDir(experimentName), "daily");
}

/**
 * Get path to daily log for a specific date
 */
export function getDailyPath(experimentName: string, date: string): string {
  return join(getDailyDir(experimentName), `${date}.json`);
}

/**
 * Get path to weekly reflections directory for an experiment
 */
export function getWeeklyDir(experimentName: string): string {
  return join(getExperimentDir(experimentName), "weekly");
}

/**
 * Get path to weekly reflection for a specific week
 */
export function getWeeklyPath(experimentName: string, week: string): string {
  return join(getWeeklyDir(experimentName), `${week}.json`);
}

/**
 * Get path to dev log markdown file
 */
export function getDevLogPath(experimentName: string): string {
  return join(getExperimentDir(experimentName), "devlog.md");
}

/**
 * Get path to metrics directory for an experiment
 */
export function getMetricsDir(experimentName: string): string {
  return join(getExperimentDir(experimentName), "metrics");
}

/**
 * Get path to metrics file for a specific block
 */
export function getMetricsPath(
  experimentName: string,
  blockId: string,
): string {
  return join(getMetricsDir(experimentName), `${blockId}.json`);
}

/**
 * Get path to templates directory
 */
export function getTemplatesDir(): string {
  return join(getDataDir(), "templates");
}

/**
 * Get path to a specific template file
 */
export function getTemplatePath(name: string): string {
  return join(getTemplatesDir(), `${name}.json`);
}

/**
 * List of directories to create for a new experiment
 */
export function getExperimentSubdirs(experimentName: string): string[] {
  return [
    getBlocksDir(experimentName),
    getCheckinsDir(experimentName),
    getDailyDir(experimentName),
    getWeeklyDir(experimentName),
    getMetricsDir(experimentName),
  ];
}

/**
 * List of directories to create on first init
 */
export function getInitialDirs(): string[] {
  return [
    getDataDir(),
    getExperimentsDir(),
    getTemplatesDir(),
  ];
}
