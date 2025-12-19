/**
 * Help text generation for Devex CLI
 */

import { VERSION } from "./version.ts";
import { getDataDir } from "./paths.ts";

export function showVersion(): void {
  console.log(`devex v${VERSION}`);
}

export function showHelp(): void {
  console.log(`
devex v${VERSION} — Developer self-experiment toolkit

Usage:
  devex <command> [options]

Commands:
  init [name]       Create a new experiment
  status            Show dashboard and next actions
  block             Manage work blocks (start, end, list)
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
  devex status                  Show progress dashboard
  devex init                    Create a new experiment interactively
  devex block start no-ai       Start a block under "no-ai" condition
  devex checkin                 Log a checkin for current block
  devex daily                   Log today's reflection
  devex weekly                  Log this week's reflection
  devex edit daily              Edit today's daily log
  devex config list             Show current configuration
  devex export -o backup.json   Export all data to file
  devex git status              Show git status of data directory
  devex sync                    Commit and push all changes
  devex metrics                 Compute git metrics for current block
  devex report                  Generate report for current block
  devex compare no-ai-1 ai-1    Compare two blocks

Data stored in: ${getDataDir()}
`);
}
