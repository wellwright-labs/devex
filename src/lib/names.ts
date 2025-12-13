/**
 * Name normalization and validation utilities
 * Used for experiment names, condition names, block IDs, etc.
 */

/**
 * Normalize a name to lowercase with dashes only
 * Converts spaces and special chars to dashes
 */
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

/**
 * Check if a name is valid after normalization
 * Valid: lowercase, numbers, dashes, not empty, no leading/trailing dashes
 */
export function isValidName(name: string): boolean {
  if (!name || name.length === 0) return false;
  if (name.startsWith("-") || name.endsWith("-")) return false;
  if (!/^[a-z0-9-]+$/.test(name)) return false;
  return true;
}

/**
 * Normalize and validate a name, returning result with info
 */
export function processName(input: string): {
  original: string;
  normalized: string;
  wasChanged: boolean;
  isValid: boolean;
} {
  const normalized = normalizeName(input);
  return {
    original: input,
    normalized,
    wasChanged: normalized !== input,
    isValid: isValidName(normalized),
  };
}

/**
 * Clean up a normalized name by removing consecutive/trailing dashes
 */
export function cleanName(name: string): string {
  return name
    .replace(/-+/g, "-")  // collapse multiple dashes
    .replace(/^-|-$/g, ""); // remove leading/trailing dashes
}

/**
 * Full pipeline: normalize, clean, validate
 */
export function sanitizeName(input: string): {
  name: string;
  wasChanged: boolean;
  isValid: boolean;
} {
  const normalized = normalizeName(input);
  const cleaned = cleanName(normalized);
  return {
    name: cleaned,
    wasChanged: cleaned !== input,
    isValid: isValidName(cleaned),
  };
}
