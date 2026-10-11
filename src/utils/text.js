/**
 * MBKUtils — Text, String and Path Utilities
 */

const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapes characters for safe HTML inclusion (&, <, >, ", ').
 * @param {string | number | null} [value]
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPE_MAP[c] || c);
}

/**
 * Escapes special characters (%, _, \) in SQL LIKE pattern matching.
 * @param {string | number} value
 * @returns {string}
 */
export function escapeLikePattern(value) {
  return String(value ?? "").replace(/[%_\\]/g, "\\$&");
}

/**
 * Escapes special characters (\, ', ", \n, \r, \t) for safe embedding in JS strings.
 * @param {string | null} [str]
 * @returns {string}
 */
export function escapeJavaScriptString(str) {
  if (!str) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

/**
 * Truncates text to a specified maximum length, appending '...' if exceeded.
 * @param {string | null} [text]
 * @param {number} [maxLength=100]
 * @param {string} [fallback="-"]
 * @returns {string}
 */
export function truncateText(text, maxLength = 100, fallback = "-") {
  if (!text) return fallback;
  const s = String(text);
  return s.length > maxLength ? `${s.substring(0, maxLength)}...` : s;
}

/**
 * Normalizes Windows backslash path separators to POSIX forward slashes.
 * @param {string | null} [filePath]
 * @returns {string}
 */
export function toPosixPath(filePath) {
  return String(filePath ?? "").replace(/\\/g, "/");
}

/**
 * Extracts base filename from a path (forward slash delimited).
 * @param {string | null} [path]
 * @returns {string}
 */
export function getBaseName(path) {
  const value = String(path ?? "");
  const lastSlash = value.lastIndexOf("/");
  return lastSlash === -1 ? value : value.slice(lastSlash + 1);
}

/**
 * Extracts lowercase file extension from a filename or path.
 * @param {string | null} [fileName]
 * @returns {string}
 */
export function getFileExt(fileName) {
  const name = getBaseName(fileName);
  const dotIndex = name.lastIndexOf(".");
  return dotIndex === -1 ? "" : name.slice(dotIndex + 1).toLowerCase();
}

/**
 * Strips both leading and trailing forward slashes from a string.
 * @param {string | null} [str]
 * @returns {string}
 */
export function trimSlashes(str) {
  return String(str ?? "").replace(/^\/+|\/+$/g, "");
}

/**
 * Strips leading forward slashes from a string.
 * @param {string | null} [str]
 * @returns {string}
 */
export function trimLeadingSlashes(str) {
  return String(str ?? "").replace(/^\/+/, "");
}
