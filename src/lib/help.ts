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
  checkin           Log a quick check-in
  daily             Log end-of-day reflection
  log [message]     Append to dev log

Options:
  --help, -h        Show this help
  --version, -v     Show version

Examples:
  pulse init                    Create a new experiment interactively
  pulse init ai-coding          Create experiment named "ai-coding"
  pulse block start no-ai       Start a block under "no-ai" condition
  pulse checkin                 Log a check-in for current block
  pulse daily                   Log today's reflection

Data stored in: ${getDataDir()}
`);
}
