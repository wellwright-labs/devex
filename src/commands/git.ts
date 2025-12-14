/**
 * pulse git command
 * Passthrough to git in the data directory
 */

import type { Args } from "@std/cli/parse-args";
import type { Command, GitArgs } from "../types/commands.ts";
import { getDataDir } from "../lib/paths.ts";
import { gitCommand as execGit, isGitRepository } from "../lib/git.ts";
import { error, info } from "../lib/format.ts";

function validate(args: Args): GitArgs {
  // Collect all positional args after "git" as passthrough args
  const passthrough = args._.slice(1).map(String);

  return {
    args: passthrough,
    help: Boolean(args.help || args.h),
  };
}

function showHelp(): void {
  console.log(`
Usage: pulse git <git-args>

Run git commands in the Pulse data directory.

All arguments are passed directly to git.

Examples:
  pulse git status
  pulse git log --oneline -5
  pulse git diff
  pulse git remote add origin <url>
  pulse git push
`);
}

async function run(args: GitArgs): Promise<void> {
  if (args.help) {
    showHelp();
    return;
  }

  if (args.args.length === 0) {
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

  // Execute git command
  const result = await execGit(args.args, dataDir);

  // Output results
  if (result.stdout) {
    console.log(result.stdout);
  }
  if (result.stderr) {
    console.error(result.stderr);
  }

  if (!result.success) {
    Deno.exit(1);
  }
}

export const gitCommand: Command<GitArgs> = {
  name: "git",
  description: "Run git commands in Pulse data directory",
  usage: "pulse git <git-args>",
  parseOptions: {
    boolean: ["help"],
    alias: { h: "help" },
    stopEarly: true, // Don't parse git's flags
  },
  validate,
  run,
};
