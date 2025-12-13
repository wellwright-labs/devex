/**
 * pulse init command
 * Creates a new experiment with interactive prompts
 */

import type { Args } from "@std/cli/parse-args";
import type { Condition, Experiment, ExperimentTemplate } from "../types/mod.ts";
import type { Command, InitArgs } from "../types/commands.ts";
import { SCHEMA_VERSIONS } from "../types/mod.ts";
import { getConfig, saveGlobalConfig } from "../lib/config.ts";
import {
  getDataDir,
  getDevLogPath,
  getExperimentPath,
  getExperimentSubdirs,
  getInitialDirs,
} from "../lib/paths.ts";
import { ensureDir, fileExists, writeJson } from "../lib/storage.ts";
import {
  promptBoolean,
  promptChoice,
  promptMultiline,
  promptText,
  promptTextRequired,
} from "../lib/prompts.ts";
import { error, info, success } from "../lib/format.ts";

// Bundled templates
import blankTemplate from "../templates/blank.json" with { type: "json" };
import aiCodingTemplate from "../templates/ai-coding.json" with { type: "json" };

const TEMPLATES: Record<string, ExperimentTemplate> = {
  blank: blankTemplate as ExperimentTemplate,
  "ai-coding": aiCodingTemplate as ExperimentTemplate,
};

function validate(args: Args): InitArgs {
  return {
    name: args._[1]?.toString(),
    template: args.template as string | undefined,
    help: Boolean(args.help || args.h),
  };
}

function showHelp(): void {
  console.log(`
Usage: pulse init [name] [options]

Create a new experiment.

Arguments:
  name              Experiment name (prompted if not provided)

Options:
  --template, -t    Template to use: blank, ai-coding (default: prompted)
  --help, -h        Show this help

Examples:
  pulse init
  pulse init my-experiment
  pulse init ai-test --template ai-coding
`);
}

async function run(args: InitArgs): Promise<void> {
  if (args.help) {
    showHelp();
    return;
  }

  const dataDir = getDataDir();
  const isFirstRun = !(await fileExists(dataDir));

  if (isFirstRun) {
    info(`First run — will create data directory at ${dataDir}`);
  }

  // Get experiment name from args or prompt
  let name = args.name;
  if (!name) {
    name = promptText("Experiment name", "my-experiment");
  }

  // Normalize name (lowercase, no special chars)
  const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (safeName !== name) {
    info(`Using normalized name: ${safeName}`);
    name = safeName;
  }

  // Check if experiment already exists
  const experimentPath = getExperimentPath(name);
  if (await fileExists(experimentPath)) {
    error(`Experiment "${name}" already exists.`);
    Deno.exit(1);
  }

  // Choose template
  let templateChoice = args.template;
  if (!templateChoice || !TEMPLATES[templateChoice]) {
    if (templateChoice && !TEMPLATES[templateChoice]) {
      error(`Unknown template: ${templateChoice}`);
      console.log(`Available: ${Object.keys(TEMPLATES).join(", ")}`);
    }
    templateChoice = promptChoice("Start from template?", ["blank", "ai-coding"], 0);
  }
  const template = TEMPLATES[templateChoice];

  // Build experiment from template
  let hypotheses = [...template.hypotheses];
  let conditions = { ...template.conditions };

  // Allow customization if blank template or user wants to customize
  const customize = templateChoice === "blank" ||
    promptBoolean("Customize hypotheses and conditions?", false);

  if (customize) {
    // Hypotheses
    console.log("\nDefine your hypotheses (what you want to learn):");
    if (hypotheses.length > 0) {
      console.log("Current hypotheses:");
      hypotheses.forEach((h, i) => console.log(`  ${i + 1}. ${h}`));
      if (promptBoolean("Keep existing hypotheses?", true)) {
        const additional = promptMultiline("Add more hypotheses");
        hypotheses = [...hypotheses, ...additional];
      } else {
        hypotheses = promptMultiline("Enter hypotheses");
      }
    } else {
      hypotheses = promptMultiline("Enter hypotheses");
    }

    // Conditions
    console.log("\nDefine your conditions (different states to compare):");
    if (Object.keys(conditions).length > 0) {
      console.log("Current conditions:");
      Object.entries(conditions).forEach(([condName, cond]) => {
        console.log(`  - ${condName}: ${cond.description}`);
      });
      if (!promptBoolean("Keep existing conditions?", true)) {
        conditions = {};
      }
    }

    // Add new conditions
    while (true) {
      const addMore = Object.keys(conditions).length === 0
        ? true
        : promptBoolean("Add another condition?", false);

      if (!addMore) break;

      const condName = promptTextRequired("Condition name (e.g., 'no-ai', 'with-music')");
      const safeCond = condName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const description = promptText("Description", "");

      conditions[safeCond] = {
        description: description || safeCond,
      } as Condition;
    }
  }

  // Create the experiment object
  const experiment: Experiment = {
    version: SCHEMA_VERSIONS.experiment,
    name,
    description: template.description,
    createdAt: new Date(),
    template: templateChoice,
    hypotheses,
    conditions,
    prompts: template.prompts,
  };

  // Create directories
  if (isFirstRun) {
    for (const dir of getInitialDirs()) {
      await ensureDir(dir);
    }
  }

  for (const dir of getExperimentSubdirs(name)) {
    await ensureDir(dir);
  }

  // Write experiment file
  await writeJson(experimentPath, experiment);

  // Initialize dev log
  const devLogPath = getDevLogPath(name);
  const devLogHeader = `# Dev Log: ${name}\n\nStarted: ${new Date().toLocaleDateString()}\n\n---\n\n`;
  await Deno.writeTextFile(devLogPath, devLogHeader);

  // Update config to set this as active experiment
  const config = await getConfig();
  config.activeExperiment = name;
  await saveGlobalConfig(config);

  // Success output
  console.log("");
  success(`Created experiment: ${name}`);
  console.log("");
  console.log(`  Hypotheses: ${hypotheses.length}`);
  console.log(`  Conditions: ${Object.keys(conditions).join(", ") || "(none)"}`);
  console.log(`  Data: ${getDataDir()}/experiments/${name}/`);
  console.log("");

  if (Object.keys(conditions).length > 0) {
    console.log("Next step:");
    console.log(`  pulse block start ${Object.keys(conditions)[0]}`);
  } else {
    console.log("Next step: Add conditions with pulse condition add <name>");
  }
}

export const initCommand: Command<InitArgs> = {
  name: "init",
  description: "Create a new experiment",
  usage: "pulse init [name] [--template <name>]",
  parseOptions: {
    string: ["template"],
    boolean: ["help"],
    alias: { t: "template", h: "help" },
  },
  validate,
  run,
};
