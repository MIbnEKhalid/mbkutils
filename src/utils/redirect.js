/**
 * Validates whether a given redirection path is a safe relative redirect,
 * preventing open redirect vulnerabilities and protocol smuggling.
 * @param {string | null} [value]
 * @returns {boolean}
 */
export function isSafeRelativeRedirect(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return false;
  return !trimmed.includes("://") && !trimmed.includes("\\");
}

/**
 * Returns a sanitized relative redirect URL or a fallback if unsafe.
 * @param {string | null} [value]
 * @param {string | null} [fallback=null]
 * @returns {string | null}
 */
export function sanitizeRelativeRedirect(value, fallback = null) {
  return isSafeRelativeRedirect(value) ? value.trim() : fallback;
}
