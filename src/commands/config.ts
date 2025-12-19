/**
 * pulse config command
 * Manage global configuration
 */

import type { Args } from "@std/cli/parse-args";
import { resolve } from "@std/path";
import type { Command, ConfigArgs } from "../types/commands.ts";
import { getConfigPath } from "../lib/paths.ts";
import {
  addRepository,
  getConfig,
  removeRepository,
  updateConfig,
} from "../lib/config.ts";
import { error, info, success } from "../lib/format.ts";
import { dirExists } from "../lib/storage.ts";

function validate(args: Args): ConfigArgs {
  const positionals = args._.map(String);

  // Handle subcommand: list, set, add, remove
  const subcommand = positionals[1] as ConfigArgs["subcommand"];

  let key: string | undefined;
  let value: string | undefined;

  if (subcommand === "set") {
    key = positionals[2];
    value = positionals[3];
  } else if (subcommand === "add" || subcommand === "remove") {
    key = positionals[2]; // e.g., "repos"
    value = positionals[3]; // e.g., path
  }

  return {
    subcommand,
    key,
    value,
    help: Boolean(args.help || args.h),
  };
}

function showHelp(): void {
  console.log(`
Usage: pulse config [subcommand] [options]

Manage global configuration.

Subcommands:
  (none)                         Open config in $EDITOR
  list                           Show current config
  set <key> <value>              Set a config value
  add repos <path>               Add a repository to track
  remove repos <path>            Remove a repository from tracking

Options:
  --help, -h                     Show this help

Config Keys:
  defaults.blockDuration         Default block duration in days
  defaults.checkinFrequency      Check-in frequency per day
  defaults.checkinPrompts        Enable check-in prompts (true/false)
  git.autoCommit                 Auto-commit on actions (true/false)
  git.commitOnBlockEnd           Commit on block end (true/false)
  git.commitOnDailyLog           Commit on daily log (true/false)
  git.commitOnWeeklyReflection   Commit on weekly reflection (true/false)

Examples:
  pulse config                   # Open in editor
  pulse config list              # Show current config
  pulse config set defaults.blockDuration 7
  pulse config add repos ~/projects/my-app
  pulse config remove repos ~/projects/old-app
`);
}

async function run(args: ConfigArgs): Promise<void> {
  if (args.help) {
    showHelp();
    return;
  }

  // No subcommand - open in editor
  if (!args.subcommand) {
    await openInEditor();
    return;
  }

  switch (args.subcommand) {
    case "list":
      await showConfig();
      break;
    case "set":
      await setConfigValue(args.key, args.value);
      break;
    case "add":
      await addRepoPath(args.key, args.value);
      break;
    case "remove":
      await removeRepoPath(args.key, args.value);
      break;
    default:
      error(`Unknown subcommand: ${args.subcommand}`);
      info("Run 'pulse config --help' for usage.");
  }
}

async function openInEditor(): Promise<void> {
  const editor = Deno.env.get("EDITOR") || Deno.env.get("VISUAL") || "vim";
  const configPath = getConfigPath();

  const command = new Deno.Command(editor, {
    args: [configPath],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const { code } = await command.output();
  if (code !== 0) {
    error(`Editor exited with code ${code}`);
  }
}

async function showConfig(): Promise<void> {
  const config = await getConfig();
  console.log(JSON.stringify(config, null, 2));
}

async function setConfigValue(
  key: string | undefined,
  value: string | undefined,
): Promise<void> {
  if (!key || value === undefined) {
    error("Usage: pulse config set <key> <value>");
    Deno.exit(1);
  }

  const config = await getConfig();
  const parts = key.split(".");

  // Parse value to appropriate type
  let parsedValue: unknown = value;
  if (value === "true") parsedValue = true;
  else if (value === "false") parsedValue = false;
  else if (/^\d+$/.test(value)) parsedValue = parseInt(value, 10);

  // Navigate to nested key and set value
  // deno-lint-ignore no-explicit-any
  let current: any = config;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current[parts[i]] === undefined) {
      error(`Unknown config key: ${key}`);
      Deno.exit(1);
    }
    current = current[parts[i]];
  }

  const lastKey = parts[parts.length - 1];
  if (current[lastKey] === undefined) {
    error(`Unknown config key: ${key}`);
    Deno.exit(1);
  }

  current[lastKey] = parsedValue;
  await updateConfig(config);
  success(`Set ${key} = ${parsedValue}`);
}

async function addRepoPath(
  target: string | undefined,
  path: string | undefined,
): Promise<void> {
  if (target !== "repos" || !path) {
    error("Usage: pulse config add repos <path>");
    Deno.exit(1);
  }

  // Resolve to absolute path (handles ".", "..", relative paths)
  const absolutePath = resolve(Deno.cwd(), path);

  // Verify directory exists
  if (!(await dirExists(absolutePath))) {
    error(`Directory not found: ${absolutePath}`);
    Deno.exit(1);
  }

  await addRepository(absolutePath);
  success(`Added repository: ${absolutePath}`);
}

async function removeRepoPath(
  target: string | undefined,
  path: string | undefined,
): Promise<void> {
  if (target !== "repos" || !path) {
    error("Usage: pulse config remove repos <path>");
    Deno.exit(1);
  }

  // Resolve to absolute path (handles ".", "..", relative paths)
  const config = await getConfig();
  const absolutePath = resolve(Deno.cwd(), path);

  if (
    !config.repositories.includes(path) &&
    !config.repositories.includes(absolutePath)
  ) {
    error(`Repository not in config: ${path}`);
    info(`Current repositories: ${config.repositories.join(", ") || "(none)"}`);
    Deno.exit(1);
  }

  // Remove whichever one exists
  if (config.repositories.includes(path)) {
    await removeRepository(path);
  } else {
    await removeRepository(absolutePath);
  }
  success(`Removed repository: ${path}`);
}

export const configCommand: Command<ConfigArgs> = {
  name: "config",
  description: "Manage global configuration",
  usage: "pulse config [subcommand]",
  parseOptions: {
    boolean: ["help"],
    alias: { h: "help" },
  },
  validate,
  run,
};
