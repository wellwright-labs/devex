/**
 * Git operations for Pulse data directory
 * Uses Deno.Command to shell out to git
 */

import { getConfig } from "./config.ts";
import { getDataDir } from "./paths.ts";

export interface GitResult {
  stdout: string;
  stderr: string;
  success: boolean;
}

/**
 * Execute a git command in the specified directory
 */
export async function gitCommand(
  args: string[],
  workingDir?: string,
): Promise<GitResult> {
  const cwd = workingDir ?? getDataDir();

  const command = new Deno.Command("git", {
    args,
    cwd,
    stdout: "piped",
    stderr: "piped",
  });

  const process = await command.output();
  const decoder = new TextDecoder();

  return {
    stdout: decoder.decode(process.stdout).trim(),
    stderr: decoder.decode(process.stderr).trim(),
    success: process.success,
  };
}

/**
 * Check if a directory is a git repository
 */
export async function isGitRepository(path?: string): Promise<boolean> {
  const result = await gitCommand(
    ["rev-parse", "--is-inside-work-tree"],
    path,
  );
  return result.success && result.stdout === "true";
}

/**
 * Initialize a git repository
 */
export async function initGitRepository(path?: string): Promise<void> {
  const cwd = path ?? getDataDir();
  const result = await gitCommand(["init"], cwd);

  if (!result.success) {
    throw new Error(`Failed to initialize git repository: ${result.stderr}`);
  }
}

/**
 * Check if there are uncommitted changes (staged or unstaged)
 */
export async function hasChanges(path?: string): Promise<boolean> {
  const result = await gitCommand(["status", "--porcelain"], path);
  return result.success && result.stdout.length > 0;
}

/**
 * Check if a remote is configured
 */
export async function hasRemote(path?: string): Promise<boolean> {
  const result = await gitCommand(["remote"], path);
  return result.success && result.stdout.length > 0;
}

/**
 * Stage all changes and commit with a message
 */
export async function commit(
  message: string,
  workingDir?: string,
): Promise<void> {
  // Stage all changes
  const addResult = await gitCommand(["add", "-A"], workingDir);
  if (!addResult.success) {
    throw new Error(`Failed to stage changes: ${addResult.stderr}`);
  }

  // Check if there's anything to commit
  const hasAnything = await hasChanges(workingDir);
  if (!hasAnything) {
    return; // Nothing to commit
  }

  // Commit
  const commitResult = await gitCommand(
    ["commit", "-m", message],
    workingDir,
  );
  if (!commitResult.success) {
    throw new Error(`Failed to commit: ${commitResult.stderr}`);
  }
}

/**
 * Push to remote (if configured)
 * Returns true if pushed, false if no remote
 */
export async function push(workingDir?: string): Promise<boolean> {
  const remote = await hasRemote(workingDir);
  if (!remote) {
    return false;
  }

  const result = await gitCommand(["push"], workingDir);
  if (!result.success) {
    throw new Error(`Failed to push: ${result.stderr}`);
  }

  return true;
}

/**
 * Auto-commit if enabled in config
 * Silent no-op if disabled or nothing to commit
 */
export async function autoCommit(message: string): Promise<void> {
  const config = await getConfig();

  if (!config.git.autoCommit) {
    return;
  }

  const dataDir = getDataDir();

  // Check if it's a git repo
  if (!(await isGitRepository(dataDir))) {
    return;
  }

  // Check if there are changes
  if (!(await hasChanges(dataDir))) {
    return;
  }

  await commit(message, dataDir);
}
