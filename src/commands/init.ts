/**
 * pulse init command
 * Creates a new experiment with interactive prompts
 */

import type { Args } from "@std/cli/parse-args";
import type {
  Condition,
  Experiment,
  ExperimentTemplate,
} from "../types/mod.ts";
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
import {
  appendToFile,
  ensureDir,
  fileExists,
  writeJson,
} from "../lib/storage.ts";
import {
  promptBoolean,
  promptChoice,
  promptMultiline,
  promptText,
  promptTextRequired,
} from "../lib/prompts.ts";
import { dim, error, info, success } from "../lib/format.ts";
import { sanitizeName } from "../lib/names.ts";
import { initGitRepository, isGitRepository } from "../lib/git.ts";
import {
  getIntervalMinutes,
  installScheduler,
  isSchedulerInstalled,
} from "../lib/scheduler.ts";

// Bundled templates
import blankTemplate from "../templates/blank.json" with { type: "json" };
import aiCodingTemplate from "../templates/ai-coding.json" with {
  type: "json",
};

const TEMPLATES: Record<string, ExperimentTemplate> = {
  blank: blankTemplate as ExperimentTemplate,
  "ai-coding": aiCodingTemplate as ExperimentTemplate,
};

const TEMPLATE_NAMES = Object.keys(TEMPLATES);

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
  --template, -t    Template to use: ${
    TEMPLATE_NAMES.join(", ")
  } (default: prompted)
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

  // Get and sanitize experiment name
  const name = await getExperimentName(args.name);

  // Check if experiment already exists
  const experimentPath = getExperimentPath(name);
  if (await fileExists(experimentPath)) {
    error(`Experiment "${name}" already exists.`);
    Deno.exit(1);
  }

  // Get template
  const template = await getTemplate(args.template);

  // Build experiment config (hypotheses and conditions)
  const { hypotheses, conditions } = await buildExperimentConfig(template);

  // Create the experiment
  const experiment: Experiment = {
    version: SCHEMA_VERSIONS.experiment,
    name,
    description: template.description,
    createdAt: new Date(),
    template: template.name,
    hypotheses,
    conditions,
    prompts: template.prompts,
  };

  // Write to disk
  await createExperimentFiles(name, experiment);

  // Set as active
  const config = await getConfig();
  config.activeExperiment = name;
  await saveGlobalConfig(config);

  // Set up reminders if not already installed
  await setupReminders(config.defaults.checkinFrequency);

  // Output success
  printSuccess(name, hypotheses, conditions);
}

async function setupReminders(frequency: number): Promise<void> {
  // Skip if already installed or not on a supported platform
  if (await isSchedulerInstalled()) {
    return;
  }

  if (Deno.build.os !== "darwin" && Deno.build.os !== "linux") {
    return;
  }

  console.log("");
  const wantReminders = await promptBoolean(
    "Set up check-in reminders?",
    true,
  );

  if (!wantReminders) {
    return;
  }

  const intervalMinutes = getIntervalMinutes(frequency);
  const installed = await installScheduler(intervalMinutes);

  if (installed) {
    const timesPerDay = frequency;
    dim(`Reminders set: ${timesPerDay}x per workday (every ~${intervalMinutes} min)`);
  } else {
    dim("Could not set up reminders. You can run 'pulse checkin' manually.");
  }
}

async function getExperimentName(providedName?: string): Promise<string> {
  let name = providedName;
  if (!name) {
    name = await promptText("Experiment name", "my-experiment");
  }

  const result = sanitizeName(name);
  if (result.wasChanged) {
    info(`Using normalized name: ${result.name}`);
  }

  if (!result.isValid) {
    error(`Invalid experiment name: "${name}"`);
    Deno.exit(1);
  }

  return result.name;
}

async function getTemplate(
  providedTemplate?: string,
): Promise<ExperimentTemplate> {
  let templateName = providedTemplate;

  if (templateName && !TEMPLATES[templateName]) {
    error(`Unknown template: ${templateName}`);
    console.log(`Available: ${TEMPLATE_NAMES.join(", ")}`);
    templateName = undefined;
  }

  if (!templateName) {
    templateName = await promptChoice("Start from template?", TEMPLATE_NAMES, 0);
  }

  return TEMPLATES[templateName];
}

async function buildExperimentConfig(
  template: ExperimentTemplate,
): Promise<{ hypotheses: string[]; conditions: Record<string, Condition> }> {
  let hypotheses = [...template.hypotheses];
  let conditions = { ...template.conditions };

  const shouldCustomize = template.name === "blank" ||
    await promptBoolean("Customize hypotheses and conditions?", false);

  if (shouldCustomize) {
    hypotheses = await customizeHypotheses(hypotheses);
    conditions = await customizeConditions(conditions);
  }

  return { hypotheses, conditions };
}

async function customizeHypotheses(existing: string[]): Promise<string[]> {
  console.log("\nDefine your hypotheses (what you want to learn):");

  if (existing.length > 0) {
    console.log("Current hypotheses:");
    existing.forEach((h, i) => console.log(`  ${i + 1}. ${h}`));

    if (await promptBoolean("Keep existing hypotheses?", true)) {
      const additional = await promptMultiline("Add more hypotheses");
      return [...existing, ...additional];
    }
  }

  return await promptMultiline("Enter hypotheses");
}

async function customizeConditions(
  existing: Record<string, Condition>,
): Promise<Record<string, Condition>> {
  console.log("\nDefine your conditions (different states to compare):");

  let conditions = { ...existing };

  if (Object.keys(conditions).length > 0) {
    console.log("Current conditions:");
    for (const [name, cond] of Object.entries(conditions)) {
      console.log(`  - ${name}: ${cond.description}`);
    }
    if (!(await promptBoolean("Keep existing conditions?", true))) {
      conditions = {};
    }
  }

  // Add new conditions
  while (true) {
    const hasConditions = Object.keys(conditions).length > 0;
    const addMore = hasConditions
      ? await promptBoolean("Add another condition?", false)
      : true;

    if (!addMore) break;

    const condName = await promptTextRequired(
      "Condition name (e.g., 'no-ai', 'with-music')",
    );
    const result = sanitizeName(condName);
    const description = await promptText("Description", "");

    conditions[result.name] = {
      description: description || result.name,
    };
  }

  return conditions;
}

async function createExperimentFiles(
  name: string,
  experiment: Experiment,
): Promise<void> {
  const dataDir = getDataDir();

  // Create directories (always ensure they exist)
  for (const dir of getInitialDirs()) {
    await ensureDir(dir);
  }
  for (const dir of getExperimentSubdirs(name)) {
    await ensureDir(dir);
  }

  // Ensure git repository is initialized
  if (!(await isGitRepository(dataDir))) {
    await initGitRepository(dataDir);
    info("Initialized git repository");
  }

  // Write experiment file
  await writeJson(getExperimentPath(name), experiment);

  // Initialize dev log
  const devLogPath = getDevLogPath(name);
  const header = `# Dev Log: ${name}\n\nStarted: ${
    new Date().toLocaleDateString()
  }\n\n---\n\n`;
  await appendToFile(devLogPath, header);
}

function printSuccess(
  name: string,
  hypotheses: string[],
  conditions: Record<string, Condition>,
): void {
  console.log("");
  success(`Created experiment: ${name}`);

  // Show hypotheses
  if (hypotheses.length > 0) {
    console.log("");
    console.log("Hypotheses:");
    hypotheses.forEach((h, i) => console.log(`  ${i + 1}. ${h}`));
  }

  // Show conditions with descriptions
  const conditionNames = Object.keys(conditions);
  if (conditionNames.length > 0) {
    console.log("");
    console.log("Conditions:");
    for (const [condName, cond] of Object.entries(conditions)) {
      console.log(`  ${condName}: ${cond.description}`);
    }
  }

  console.log("");
  dim(`Data: ${getDataDir()}/experiments/${name}/`);
  dim("Changes auto-committed to git");
  console.log("");

  if (conditionNames.length > 0) {
    console.log("Next step:");
    console.log(`  pulse block start ${conditionNames[0]}`);
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
