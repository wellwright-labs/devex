/**
 * Output formatting utilities for Pulse
 * Provides consistent styled output for the CLI
 */

// ANSI color codes (respects NO_COLOR env var)
const useColor = !Deno.env.get("NO_COLOR");

const colors = {
  reset: useColor ? "\x1b[0m" : "",
  bold: useColor ? "\x1b[1m" : "",
  dim: useColor ? "\x1b[2m" : "",
  green: useColor ? "\x1b[32m" : "",
  yellow: useColor ? "\x1b[33m" : "",
  red: useColor ? "\x1b[31m" : "",
  cyan: useColor ? "\x1b[36m" : "",
};

/**
 * Print a success message
 */
export function success(message: string): void {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

/**
 * Print an error message
 */
export function error(message: string): void {
  console.error(`${colors.red}✗${colors.reset} ${message}`);
}

/**
 * Print a warning message
 */
export function warn(message: string): void {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

/**
 * Print an info message
 */
export function info(message: string): void {
  console.log(`${colors.cyan}ℹ${colors.reset} ${message}`);
}

/**
 * Print a dim/secondary message
 */
export function dim(message: string): void {
  console.log(`${colors.dim}${message}${colors.reset}`);
}

/**
 * Format a block status header
 * Example: [Block: no-ai | Day 12 of 14]
 */
export function formatBlockStatus(
  condition: string,
  dayInBlock: number,
  expectedDuration: number,
): string {
  return `${colors.dim}[${colors.reset}Block: ${colors.bold}${condition}${colors.reset} ${colors.dim}|${colors.reset} Day ${dayInBlock} of ${expectedDuration}${colors.dim}]${colors.reset}`;
}

/**
 * Format a date for display (local timezone)
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a time for display (local timezone)
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format a datetime for display
 */
export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

/**
 * Format a date as YYYY-MM-DD (for file names and IDs)
 */
export function formatDateId(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format as ISO week string YYYY-Www
 */
export function formatWeekId(date: Date): string {
  const { year, week } = getISOWeekAndYear(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/**
 * Get ISO week number and year
 * Year may differ from calendar year at year boundaries
 */
function getISOWeekAndYear(date: Date): { year: number; week: number } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Set to nearest Thursday (ISO weeks start Monday, week 1 contains Jan 4)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const year = d.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year, week };
}

/**
 * Print a simple table
 */
export function printTable(
  headers: string[],
  rows: string[][],
): void {
  // Calculate column widths
  const widths = headers.map((h, i) => {
    const maxContent = Math.max(h.length, ...rows.map((r) => (r[i] || "").length));
    return maxContent;
  });

  // Print header
  const headerLine = headers
    .map((h, i) => h.padEnd(widths[i]))
    .join("  ");
  console.log(`${colors.bold}${headerLine}${colors.reset}`);

  // Print separator
  const separator = widths.map((w) => "─".repeat(w)).join("──");
  console.log(`${colors.dim}${separator}${colors.reset}`);

  // Print rows
  for (const row of rows) {
    const rowLine = row.map((cell, i) => (cell || "").padEnd(widths[i])).join("  ");
    console.log(rowLine);
  }
}
