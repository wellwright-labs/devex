/**
 * Interactive prompt utilities for Devex
 * Uses TTY utilities for better UX when available, falls back to basic prompts
 */

import * as tty from "./tty.ts";

/**
 * Prompt for a text value with placeholder display
 * Returns empty string if user presses Enter without input
 */
export async function promptText(
  question: string,
  defaultValue = "",
): Promise<string> {
  return await tty.input(question, defaultValue);
}

/**
 * Prompt for a required text value
 * Keeps prompting until user provides non-empty input
 */
export async function promptTextRequired(question: string): Promise<string> {
  while (true) {
    const result = await tty.input(question);
    if (result.trim() !== "") {
      return result.trim();
    }
    console.log("  This field is required.");
  }
}

/**
 * Prompt for a yes/no boolean with visual toggle
 * Default is used if user presses Enter
 */
export async function promptBoolean(
  question: string,
  defaultValue = false,
): Promise<boolean> {
  return await tty.confirm(question, defaultValue);
}

/**
 * Prompt for a numeric rating (typically 1-5) with arrow key adjustment
 * Returns default if user presses Enter
 */
export async function promptRating(
  question: string,
  min = 1,
  max = 5,
  defaultValue = 3,
): Promise<number> {
  return await tty.rating(question, min, max, defaultValue);
}

/**
 * Prompt for a number (any positive integer)
 * Returns default if user presses Enter, null if skipped with empty on optional
 */
export async function promptNumber(
  question: string,
  defaultValue?: number,
): Promise<number | null> {
  const result = await tty.input(
    question,
    defaultValue !== undefined ? String(defaultValue) : "",
  );

  if (result === "") {
    return defaultValue ?? null;
  }

  const num = parseInt(result.trim(), 10);
  if (!isNaN(num) && num >= 0) {
    return num;
  }

  console.log("  Please enter a valid number.");
  return await promptNumber(question, defaultValue);
}

/**
 * Prompt for a choice from a list of options with arrow key navigation
 * Returns the selected option string
 */
export async function promptChoice(
  question: string,
  options: string[],
  defaultIndex = 0,
): Promise<string> {
  const index = await tty.select(question, options, defaultIndex);
  return options[index];
}

/**
 * Prompt for multiple lines of text
 * Empty line ends input
 * Returns array of non-empty lines
 */
export async function promptMultiline(question: string): Promise<string[]> {
  console.log(`${question} (empty line to finish):`);
  const lines: string[] = [];

  while (true) {
    const line = await tty.input(">");
    if (line.trim() === "") {
      break;
    }
    lines.push(line.trim());
  }

  return lines;
}
