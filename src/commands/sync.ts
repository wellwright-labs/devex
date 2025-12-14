/**
 * pulse sync command
 * Commit and push data directory to remote
 */

import type { Args } from "@std/cli/parse-args";
import type { Command, SyncArgs } from "../types/commands.ts";
import { getDataDir } from "../lib/paths.ts";
import {
  commit,
  hasChanges,
  hasRemote,
  isGitRepository,
  push,
} from "../lib/git.ts";
import { error, info, success, warn } from "../lib/format.ts";

function validate(args: Args): SyncArgs {
  return {
    message: (args.message as string) || (args.m as string),
    noPush: Boolean(args["no-push"]),
    help: Boolean(args.help || args.h),
  };
}

function showHelp(): void {
  console.log(`
Usage: pulse sync [options]

Commit and push Pulse data to remote.

Options:
  --message, -m   Custom commit message
  --no-push       Commit only, don't push
  --help, -h      Show this help

Examples:
  pulse sync
  pulse sync --message "Weekly backup"
  pulse sync --no-push
`);
}

async function run(args: SyncArgs): Promise<void> {
  if (args.help) {
    showHelp();
    return;
  }

  const dataDir = getDataDir();

  // Check if data dir is a git repo
  if (!(await isGitRepository(dataDir))) {
    error("Pulse data directory is not a git repository.");
    info("Run 'pulse init' to create an experiment and initialize git.");
    Deno.exit(1);
  }

  // Check for changes
  const changes = await hasChanges(dataDir);
  if (!changes) {
    info("Nothing to sync - no uncommitted changes.");
    return;
  }

  // Create commit message
  const timestamp = new Date().toISOString().split("T")[0];
  const message = args.message || `Pulse sync: ${timestamp}`;

  // Commit
  try {
    await commit(message, dataDir);
    success("Changes committed");
  } catch (err) {
    error(`Commit failed: ${err instanceof Error ? err.message : err}`);
    Deno.exit(1);
  }

  // Push (unless --no-push)
  if (args.noPush) {
    info("Skipping push (--no-push)");
    return;
  }

  const remote = await hasRemote(dataDir);
  if (!remote) {
    warn("No remote configured - changes committed but not pushed.");
    info("Add a remote with: pulse git remote add origin <url>");
    return;
  }

  try {
    await push(dataDir);
    success("Pushed to remote");
  } catch (err) {
    error(`Push failed: ${err instanceof Error ? err.message : err}`);
    Deno.exit(1);
  }
}

export const syncCommand: Command<SyncArgs> = {
  name: "sync",
  description: "Commit and push Pulse data to remote",
  usage: "pulse sync [--message <msg>] [--no-push]",
  parseOptions: {
    string: ["message"],
    boolean: ["help", "no-push"],
    alias: { m: "message", h: "help" },
  },
  validate,
  run,
};
