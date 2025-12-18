/**
 * Help text generation for Pulse CLI
 */

import { VERSION } from "./version.ts";
import { getDataDir } from "./paths.ts";

export function showVersion(): void {
  console.log(`pulse v${VERSION}`);
}

export function showHelp(): void {
  console.log(`
pulse v${VERSION} — Developer self-experiment toolkit

Usage:
  pulse <command> [options]

Commands:
  init [name]       Create a new experiment
  block             Manage work blocks (start, end, status)
  checkin           Log a quick checkin
  daily             Log end-of-day reflection
  weekly            Log weekly reflection
  log [message]     Append to dev log
  config            Manage global configuration
  edit              Edit data files in $EDITOR
  export            Export experiment data as JSON
  git <args>        Run git in data directory
  sync              Commit and push data to remote
  metrics           Compute git metrics for a block
  report            Generate analysis report
  compare           Compare metrics between blocks

Options:
  --help, -h        Show this help
  --version, -v     Show version

Examples:
  pulse init                    Create a new experiment interactively
  pulse init ai-coding          Create experiment named "ai-coding"
  pulse block start no-ai       Start a block under "no-ai" condition
  pulse checkin                 Log a checkin for current block
  pulse daily                   Log today's reflection
  pulse weekly                  Log this week's reflection
  pulse edit daily              Edit today's daily log
  pulse config list             Show current configuration
  pulse export -o backup.json   Export all data to file
  pulse git status              Show git status of data directory
  pulse sync                    Commit and push all changes
  pulse metrics                 Compute git metrics for current block
  pulse report                  Generate report for current block
  pulse compare no-ai-1 ai-1    Compare two blocks

Data stored in: ${getDataDir()}
`);
}
