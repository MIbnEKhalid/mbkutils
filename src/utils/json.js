/**
 * MBKUtils — JSON Utilities
 */

/**
 * Safely parses a JSON string into a parsed object.
 * Returns the fallback value if parsing fails or if input is falsy/invalid.
 * @template T
 * @param {unknown} value
 * @param {T} [fallback={}]
 * @returns {T}
 */
export function safeParseJSON(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
