/**
 * Configuration management for Pulse
 * Handles loading, saving, and merging config from defaults and user settings
 */

import type { GlobalConfig } from "../types/mod.ts";
import { getConfigPath, getDataDir } from "./paths.ts";
import { readJson, writeJson } from "./storage.ts";

/**
 * Default configuration values
 */
export function getDefaults(): GlobalConfig {
  return {
    version: 1,
    activeExperiment: null,
    dataDir: getDataDir(),

    defaults: {
      blockDuration: 14,
      checkinFrequency: 3,
      checkinPrompts: true,
    },

    repositories: [],

    git: {
      autoCommit: true,
      commitOnBlockEnd: true,
      commitOnDailyLog: true,
    },
  };
}

/**
 * Load global config from disk
 * Returns null if config doesn't exist
 */
export async function loadGlobalConfig(): Promise<GlobalConfig | null> {
  return await readJson<GlobalConfig>(getConfigPath());
}

/**
 * Save global config to disk
 */
export async function saveGlobalConfig(config: GlobalConfig): Promise<void> {
  await writeJson(getConfigPath(), config);
}

/**
 * Get the effective config by merging defaults with saved config
 * Always returns a complete config object
 */
export async function getConfig(): Promise<GlobalConfig> {
  const saved = await loadGlobalConfig();
  if (!saved) {
    return getDefaults();
  }
  return mergeConfig(getDefaults(), saved);
}

/**
 * Deep merge two config objects
 * The second object's values override the first
 */
export function mergeConfig(
  defaults: GlobalConfig,
  saved: Partial<GlobalConfig>,
): GlobalConfig {
  return {
    version: saved.version ?? defaults.version,
    activeExperiment: saved.activeExperiment ?? defaults.activeExperiment,
    dataDir: saved.dataDir ?? defaults.dataDir,

    defaults: {
      blockDuration: saved.defaults?.blockDuration ??
        defaults.defaults.blockDuration,
      checkinFrequency: saved.defaults?.checkinFrequency ??
        defaults.defaults.checkinFrequency,
      checkinPrompts: saved.defaults?.checkinPrompts ??
        defaults.defaults.checkinPrompts,
    },

    repositories: saved.repositories ?? defaults.repositories,

    git: {
      autoCommit: saved.git?.autoCommit ?? defaults.git.autoCommit,
      commitOnBlockEnd: saved.git?.commitOnBlockEnd ??
        defaults.git.commitOnBlockEnd,
      commitOnDailyLog: saved.git?.commitOnDailyLog ??
        defaults.git.commitOnDailyLog,
    },

    github: saved.github ?? defaults.github,
  };
}

/**
 * Update specific config values and save
 */
export async function updateConfig(
  updates: Partial<GlobalConfig>,
): Promise<GlobalConfig> {
  const current = await getConfig();
  const updated = mergeConfig(current, updates);
  await saveGlobalConfig(updated);
  return updated;
}

/**
 * Set the active experiment
 */
export async function setActiveExperiment(name: string | null): Promise<void> {
  await updateConfig({ activeExperiment: name });
}

/**
 * Add a repository to track for git metrics
 */
export async function addRepository(path: string): Promise<void> {
  const config = await getConfig();
  if (!config.repositories.includes(path)) {
    config.repositories.push(path);
    await saveGlobalConfig(config);
  }
}

/**
 * Remove a repository from tracking
 */
export async function removeRepository(path: string): Promise<void> {
  const config = await getConfig();
  const index = config.repositories.indexOf(path);
  if (index !== -1) {
    config.repositories.splice(index, 1);
    await saveGlobalConfig(config);
  }
}

/**
 * Get GitHub token from env var or config
 * Priority: GITHUB_TOKEN env var > config.github.token
 */
export async function getGitHubToken(): Promise<string | null> {
  const envToken = Deno.env.get("GITHUB_TOKEN");
  if (envToken) {
    return envToken;
  }

  const config = await getConfig();
  return config.github?.token ?? null;
}
