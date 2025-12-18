/**
 * TTY utilities for interactive terminal prompts
 * Zero-dependency implementation using Deno raw mode
 */

// ANSI escape codes
const ESC = "\x1b";
const CSI = `${ESC}[`;

export const ansi = {
  // Cursor
  hideCursor: `${CSI}?25l`,
  showCursor: `${CSI}?25h`,
  cursorUp: (n = 1) => `${CSI}${n}A`,
  cursorDown: (n = 1) => `${CSI}${n}B`,
  cursorTo: (col: number) => `${CSI}${col}G`,
  cursorSave: `${ESC}7`,
  cursorRestore: `${ESC}8`,

  // Line
  clearLine: `${CSI}2K`,
  clearToEnd: `${CSI}0K`,

  // Style
  reset: `${CSI}0m`,
  bold: `${CSI}1m`,
  dim: `${CSI}2m`,
  green: `${CSI}32m`,
  cyan: `${CSI}36m`,
  yellow: `${CSI}33m`,
};

// Key codes
const CTRL_C = 0x03;
const ENTER = 13;
const ESCAPE = 27;
const BACKSPACE = 127;
const DEL = 8;

export type Key =
  | { type: "char"; char: string }
  | { type: "enter" }
  | { type: "escape" }
  | { type: "backspace" }
  | { type: "up" }
  | { type: "down" }
  | { type: "left" }
  | { type: "right" }
  | { type: "ctrl-c" }
  | { type: "unknown" };

/**
 * Read a single keypress from stdin in raw mode
 */
export async function readKey(): Promise<Key> {
  const buf = new Uint8Array(8);
  const n = await Deno.stdin.read(buf);

  if (n === null || n === 0) {
    return { type: "unknown" };
  }

  const first = buf[0];

  // Ctrl+C
  if (first === CTRL_C) {
    return { type: "ctrl-c" };
  }

  // Enter
  if (first === ENTER) {
    return { type: "enter" };
  }

  // Backspace (both DEL and Backspace)
  if (first === BACKSPACE || first === DEL) {
    return { type: "backspace" };
  }

  // Escape sequences
  if (first === ESCAPE) {
    if (n === 1) {
      return { type: "escape" };
    }

    // Arrow keys: ESC [ A/B/C/D
    if (buf[1] === 91) {
      // '['
      switch (buf[2]) {
        case 65:
          return { type: "up" };
        case 66:
          return { type: "down" };
        case 67:
          return { type: "right" };
        case 68:
          return { type: "left" };
      }
    }

    return { type: "unknown" };
  }

  // Regular character
  const char = new TextDecoder().decode(buf.subarray(0, n));
  return { type: "char", char };
}

/**
 * Write to stdout
 */
export function write(text: string): void {
  Deno.stdout.writeSync(new TextEncoder().encode(text));
}

/**
 * Interactive select prompt with arrow key navigation
 */
export async function select(
  question: string,
  options: string[],
  defaultIndex = 0,
): Promise<number> {
  if (options.length === 0) {
    return -1;
  }

  if (!Deno.stdin.isTerminal()) {
    // Fallback to numbered list for non-TTY
    console.log(question);
    options.forEach((opt, i) => {
      const marker = i === defaultIndex ? ">" : " ";
      console.log(`  ${marker} ${i + 1}. ${opt}`);
    });
    const result = prompt(`Choice [${defaultIndex + 1}]:`);
    if (result === null || result.trim() === "") {
      return defaultIndex;
    }
    const num = parseInt(result.trim(), 10);
    if (!isNaN(num) && num >= 1 && num <= options.length) {
      return num - 1;
    }
    return defaultIndex;
  }

  let selected = defaultIndex;

  // Render function
  const render = () => {
    // Move to start and clear
    write(`\r${ansi.clearLine}`);
    write(`${question}\n`);

    for (let i = 0; i < options.length; i++) {
      write(ansi.clearLine);
      if (i === selected) {
        write(`${ansi.cyan}❯ ${options[i]}${ansi.reset}\n`);
      } else {
        write(`  ${ansi.dim}${options[i]}${ansi.reset}\n`);
      }
    }
  };

  // Move cursor up to redraw
  const moveUp = () => {
    write(ansi.cursorUp(options.length + 1));
  };

  try {
    Deno.stdin.setRaw(true);
    write(ansi.hideCursor);

    render();

    while (true) {
      const key = await readKey();

      if (key.type === "ctrl-c") {
        write(ansi.showCursor);
        Deno.stdin.setRaw(false);
        Deno.exit(130);
      }

      if (key.type === "enter") {
        break;
      }

      if (key.type === "up" && selected > 0) {
        selected--;
        moveUp();
        render();
      }

      if (key.type === "down" && selected < options.length - 1) {
        selected++;
        moveUp();
        render();
      }

      // Number keys for quick select
      if (key.type === "char") {
        const num = parseInt(key.char, 10);
        if (!isNaN(num) && num >= 1 && num <= options.length) {
          selected = num - 1;
          moveUp();
          render();
        }
      }
    }
  } finally {
    Deno.stdin.setRaw(false);
    write(ansi.showCursor);
  }

  return selected;
}

/**
 * Text input with placeholder display
 */
export async function input(
  question: string,
  defaultValue = "",
): Promise<string> {
  if (!Deno.stdin.isTerminal()) {
    // Fallback for non-TTY
    const suffix = defaultValue ? ` [${defaultValue}]` : "";
    const result = prompt(`${question}${suffix}:`);
    if (result === null || result.trim() === "") {
      return defaultValue;
    }
    return result.trim();
  }

  let value = "";

  const render = () => {
    write(`\r${ansi.clearLine}`);
    if (value) {
      write(`${question}: ${value}`);
    } else if (defaultValue) {
      write(`${question}: ${ansi.dim}${defaultValue}${ansi.reset}`);
    } else {
      write(`${question}: `);
    }
  };

  try {
    Deno.stdin.setRaw(true);
    render();

    while (true) {
      const key = await readKey();

      if (key.type === "ctrl-c") {
        Deno.stdin.setRaw(false);
        Deno.exit(130);
      }

      if (key.type === "enter") {
        write("\n");
        break;
      }

      if (key.type === "backspace") {
        if (value.length > 0) {
          value = value.slice(0, -1);
          render();
        }
        continue;
      }

      if (key.type === "char") {
        value += key.char;
        render();
      }
    }
  } finally {
    Deno.stdin.setRaw(false);
  }

  return value || defaultValue;
}

/**
 * Rating input (1-5) with arrow key adjustment
 */
export async function rating(
  question: string,
  min = 1,
  max = 5,
  defaultValue = 3,
): Promise<number> {
  if (!Deno.stdin.isTerminal()) {
    // Fallback for non-TTY
    const result = prompt(`${question} (${min}-${max}) [${defaultValue}]:`);
    if (result === null || result.trim() === "") {
      return defaultValue;
    }
    const num = parseInt(result.trim(), 10);
    if (!isNaN(num) && num >= min && num <= max) {
      return num;
    }
    return defaultValue;
  }

  let value = defaultValue;

  const renderScale = () => {
    let scale = "";
    for (let i = min; i <= max; i++) {
      if (i === value) {
        scale += `${ansi.cyan}${ansi.bold}${i}${ansi.reset} `;
      } else {
        scale += `${ansi.dim}${i}${ansi.reset} `;
      }
    }
    return scale;
  };

  const render = () => {
    write(`\r${ansi.clearLine}`);
    write(`${question}: ${renderScale()}`);
  };

  try {
    Deno.stdin.setRaw(true);
    render();

    while (true) {
      const key = await readKey();

      if (key.type === "ctrl-c") {
        Deno.stdin.setRaw(false);
        Deno.exit(130);
      }

      if (key.type === "enter") {
        write("\n");
        break;
      }

      if ((key.type === "left" || key.type === "down") && value > min) {
        value--;
        render();
      }

      if ((key.type === "right" || key.type === "up") && value < max) {
        value++;
        render();
      }

      // Number keys for direct input
      if (key.type === "char") {
        const num = parseInt(key.char, 10);
        if (!isNaN(num) && num >= min && num <= max) {
          value = num;
          render();
        }
      }
    }
  } finally {
    Deno.stdin.setRaw(false);
  }

  return value;
}

/**
 * Yes/No confirm prompt
 */
export async function confirm(
  question: string,
  defaultValue = false,
): Promise<boolean> {
  if (!Deno.stdin.isTerminal()) {
    // Fallback for non-TTY
    const hint = defaultValue ? "[Y/n]" : "[y/N]";
    const result = prompt(`${question} ${hint}:`);
    if (result === null || result.trim() === "") {
      return defaultValue;
    }
    const lower = result.trim().toLowerCase();
    return lower === "y" || lower === "yes";
  }

  let value = defaultValue;

  const render = () => {
    write(`\r${ansi.clearLine}`);
    const yes = value
      ? `${ansi.cyan}${ansi.bold}Yes${ansi.reset}`
      : `${ansi.dim}Yes${ansi.reset}`;
    const no = !value
      ? `${ansi.cyan}${ansi.bold}No${ansi.reset}`
      : `${ansi.dim}No${ansi.reset}`;
    write(`${question} ${yes} / ${no}`);
  };

  try {
    Deno.stdin.setRaw(true);
    render();

    while (true) {
      const key = await readKey();

      if (key.type === "ctrl-c") {
        Deno.stdin.setRaw(false);
        Deno.exit(130);
      }

      if (key.type === "enter") {
        write("\n");
        break;
      }

      if (
        key.type === "left" || key.type === "right" || key.type === "up" ||
        key.type === "down"
      ) {
        value = !value;
        render();
      }

      if (key.type === "char") {
        if (key.char.toLowerCase() === "y") {
          value = true;
          render();
        } else if (key.char.toLowerCase() === "n") {
          value = false;
          render();
        }
      }
    }
  } finally {
    Deno.stdin.setRaw(false);
  }

  return value;
}
