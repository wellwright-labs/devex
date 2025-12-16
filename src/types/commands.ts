/**
 * Command type definitions
 * Each command exports a Command object with args config, validation, and handler
 */

import type { Args, ParseOptions } from "@std/cli/parse-args";

/**
 * Validated args for init command
 */
export interface InitArgs {
  name?: string;
  template?: string;
  help: boolean;
}

/**
 * Validated args for block command
 */
export interface BlockArgs {
  subcommand?: "start" | "end" | "status" | "list" | "extend";
  condition?: string;
  days?: number;
  duration?: number;
  tags?: string[];
  help: boolean;
}

/**
 * Validated args for checkin command
 */
export interface CheckinArgs {
  quick: boolean;
  help: boolean;
}

/**
 * Validated args for daily command
 */
export interface DailyArgs {
  help: boolean;
}

/**
 * Validated args for log command
 */
export interface LogArgs {
  message?: string;
  help: boolean;
}

/**
 * Validated args for git command (passthrough)
 */
export interface GitArgs {
  args: string[]; // passthrough args to git
  help: boolean;
}

/**
 * Validated args for sync command
 */
export interface SyncArgs {
  message?: string;
  noPush: boolean;
  help: boolean;
}

/**
 * Validated args for metrics command
 */
export interface MetricsArgs {
  block?: string;
  refresh: boolean;
  help: boolean;
}

/**
 * Validated args for report command
 */
export interface ReportArgs {
  block?: string;
  help: boolean;
}

/**
 * Validated args for compare command
 */
export interface CompareArgs {
  blocks: string[];
  help: boolean;
}

/**
 * Command definition
 */
export interface Command<T> {
  name: string;
  description: string;
  usage: string;
  parseOptions: ParseOptions;
  validate: (args: Args) => T;
  run: (args: T) => Promise<void>;
}
