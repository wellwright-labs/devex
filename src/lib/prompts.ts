/**
 * Interactive prompt utilities for Pulse
 * All prompts support Enter to accept default/skip
 */

/**
 * Prompt for a text value
 * Returns empty string if user presses Enter without input
 */
export function promptText(question: string, defaultValue = ""): string {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const result = prompt(`${question}${suffix}:`);

  if (result === null || result.trim() === "") {
    return defaultValue;
  }
  return result.trim();
}

/**
 * Prompt for a required text value
 * Keeps prompting until user provides non-empty input
 */
export function promptTextRequired(question: string): string {
  while (true) {
    const result = prompt(`${question}:`);
    if (result !== null && result.trim() !== "") {
      return result.trim();
    }
    console.log("  This field is required.");
  }
}

/**
 * Prompt for a yes/no boolean
 * Default is used if user presses Enter
 */
export function promptBoolean(question: string, defaultValue = false): boolean {
  const hint = defaultValue ? "[Y/n]" : "[y/N]";
  const result = prompt(`${question} ${hint}:`);

  if (result === null || result.trim() === "") {
    return defaultValue;
  }

  const lower = result.trim().toLowerCase();
  return lower === "y" || lower === "yes";
}

/**
 * Prompt for a numeric rating (typically 1-5)
 * Returns default if user presses Enter
 */
export function promptRating(
  question: string,
  min = 1,
  max = 5,
  defaultValue = 3,
): number {
  while (true) {
    const result = prompt(`${question} (${min}-${max}) [${defaultValue}]:`);

    if (result === null || result.trim() === "") {
      return defaultValue;
    }

    const num = parseInt(result.trim(), 10);
    if (!isNaN(num) && num >= min && num <= max) {
      return num;
    }

    console.log(`  Please enter a number between ${min} and ${max}.`);
  }
}

/**
 * Prompt for a number (any positive integer)
 * Returns default if user presses Enter, null if skipped with empty on optional
 */
export function promptNumber(
  question: string,
  defaultValue?: number,
): number | null {
  const suffix = defaultValue !== undefined ? ` [${defaultValue}]` : "";

  while (true) {
    const result = prompt(`${question}${suffix}:`);

    if (result === null || result.trim() === "") {
      return defaultValue ?? null;
    }

    const num = parseInt(result.trim(), 10);
    if (!isNaN(num) && num >= 0) {
      return num;
    }

    console.log("  Please enter a valid number.");
  }
}

/**
 * Prompt for a choice from a list of options
 * Returns the selected option string
 */
export function promptChoice(
  question: string,
  options: string[],
  defaultIndex = 0,
): string {
  console.log(`${question}`);
  options.forEach((opt, i) => {
    const marker = i === defaultIndex ? "*" : " ";
    console.log(`  ${marker}${i + 1}. ${opt}`);
  });

  while (true) {
    const result = prompt(`Choice [${defaultIndex + 1}]:`);

    if (result === null || result.trim() === "") {
      return options[defaultIndex];
    }

    const num = parseInt(result.trim(), 10);
    if (!isNaN(num) && num >= 1 && num <= options.length) {
      return options[num - 1];
    }

    // Also accept the option text directly
    const match = options.find(
      (o) => o.toLowerCase() === result.trim().toLowerCase(),
    );
    if (match) {
      return match;
    }

    console.log(`  Please enter a number 1-${options.length}.`);
  }
}

/**
 * Prompt for multiple lines of text
 * Empty line ends input
 * Returns array of non-empty lines
 */
export function promptMultiline(question: string): string[] {
  console.log(`${question} (empty line to finish):`);
  const lines: string[] = [];

  while (true) {
    const line = prompt(">");
    if (line === null || line.trim() === "") {
      break;
    }
    lines.push(line.trim());
  }

  return lines;
}

/**
 * Display a confirmation prompt before a destructive action
 */
export function confirmAction(message: string): boolean {
  return promptBoolean(`${message} Are you sure?`, false);
}
