/**
 * pulse edit command
 * Open data files in the user's editor
 */

import type { Args } from "@std/cli/parse-args";
import type { Command, EditArgs } from "../types/commands.ts";
import {
  getBlockPath,
  getCheckinsPath,
  getConfigPath,
  getDailyPath,
  getExperimentPath,
  getWeeklyPath,
} from "../lib/paths.ts";
import { fileExists } from "../lib/storage.ts";
import { requireExperiment } from "../lib/state.ts";
import { error, formatDateId, formatWeekId, info } from "../lib/format.ts";

function validate(args: Args): EditArgs {
  const positionals = args._.map(String);

  return {
    target: positionals[1] as EditArgs["target"],
    identifier: positionals[2],
    help: Boolean(args.help || args.h),
  };
}

function showHelp(): void {
  console.log(`
Usage: pulse edit <target> [identifier]

Open data files in $EDITOR.

Targets:
  daily [date]        Daily log (default: today, format: YYYY-MM-DD)
  checkin [date]      Check-ins for date (default: today)
  weekly [week]       Weekly reflection (default: current week, format: YYYY-Www)
  block <name>        Block definition file
  config              Global config file
  experiment          Current experiment definition

Options:
  --help, -h          Show this help

Examples:
  pulse edit daily                    # Edit today's daily log
  pulse edit daily 2025-01-15         # Edit specific date
  pulse edit weekly                   # Edit this week's reflection
  pulse edit weekly 2025-W03          # Edit specific week
  pulse edit block no-ai-1            # Edit block definition
  pulse edit config                   # Edit global config
`);
}

async function run(args: EditArgs): Promise<void> {
  if (args.help) {
    showHelp();
    return;
  }

  if (!args.target) {
    error("Please specify a target to edit.");
    info("Run 'pulse edit --help' for available targets.");
    return;
  }

  const path = await resolveTargetPath(args.target, args.identifier);
  if (!path) {
    return; // Error already printed
  }

  // Check if file exists
  if (!(await fileExists(path))) {
    error(`File not found: ${path}`);
    if (args.target === "daily") {
      info("Create a daily log first with: pulse daily");
    } else if (args.target === "weekly") {
      info("Create a weekly reflection first with: pulse weekly");
    } else if (args.target === "checkin") {
      info("Create a check-in first with: pulse checkin");
    }
    return;
  }

  await openInEditor(path);
}

async function resolveTargetPath(
  target: string,
  identifier?: string,
): Promise<string | null> {
  const now = new Date();

  switch (target) {
    case "config":
      return getConfigPath();

    case "experiment": {
      const experiment = await requireExperiment();
      return getExperimentPath(experiment.name);
    }

    case "daily": {
      const experiment = await requireExperiment();
      const date = identifier || formatDateId(now);
      return getDailyPath(experiment.name, date);
    }

    case "checkin": {
      const experiment = await requireExperiment();
      const date = identifier || formatDateId(now);
      return getCheckinsPath(experiment.name, date);
    }

    case "weekly": {
      const experiment = await requireExperiment();
      const week = identifier || formatWeekId(now);
      return getWeeklyPath(experiment.name, week);
    }

    case "block": {
      if (!identifier) {
        error("Block name required. Usage: pulse edit block <name>");
        return null;
      }
      const experiment = await requireExperiment();
      return getBlockPath(experiment.name, identifier);
    }

    default:
      error(`Unknown target: ${target}`);
      info("Run 'pulse edit --help' for available targets.");
      return null;
  }
}

async function openInEditor(path: string): Promise<void> {
  const editor = Deno.env.get("EDITOR") || Deno.env.get("VISUAL") || "vim";

  const command = new Deno.Command(editor, {
    args: [path],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const { code } = await command.output();
  if (code !== 0) {
    error(`Editor exited with code ${code}`);
  }
}

export const editCommand: Command<EditArgs> = {
  name: "edit",
  description: "Open data files in editor",
  usage: "pulse edit <target> [identifier]",
  parseOptions: {
    boolean: ["help"],
    alias: { h: "help" },
  },
  validate,
  run,
};
