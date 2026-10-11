/**
 * MBKUtils — Standardized Date & Time Utilities
 * Copyright (c) 2026 Muhammad Bin Khalid, MBKTech.org and contributors
 * Licensed under the MIT License.
 * Source: https://github.com/MIbnEKhalid/mbkutils
 */

/**
 * Safely parses any date input (Date object, ISO string, timestamp number, or "now"/"today") into a valid Date or null.
 * @param {any} input
 * @returns {Date | null}
 */
export function parseDate(input) {
  if (input === null || input === undefined || input === "") return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed === "" || trimmed.toLowerCase() === "invalid date") return null;
    if (trimmed.toLowerCase() === "now" || trimmed.toLowerCase() === "today") return new Date();
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === "number") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Returns current timestamp as an ISO 8601 string.
 * @returns {string}
 */
export function nowIso() {
  return new Date().toISOString();
}

/**
 * Converts a date input to an ISO 8601 string, or empty string if invalid.
 * @param {any} input
 * @returns {string}
 */
export function toISOString(input) {
  const d = parseDate(input);
  return d ? d.toISOString() : "";
}

/**
 * Standardized date formatter for human-readable dates (e.g., "Jan 1, 2026").
 * Safe for direct use in Handlebars helpers or backend services.
 * @param {any} input
 * @param {any} [fallbackOrOptions]
 * @returns {string}
 */
export function formatDate(input, fallbackOrOptions) {
  let fallback = "N/A";
  let locale = "en-US";
  if (typeof fallbackOrOptions === "string") {
    fallback = fallbackOrOptions;
  } else if (fallbackOrOptions && typeof fallbackOrOptions === "object" && !fallbackOrOptions.hash) {
    if (fallbackOrOptions.fallback !== undefined) fallback = fallbackOrOptions.fallback;
    if (fallbackOrOptions.locale !== undefined) locale = fallbackOrOptions.locale;
  }
  const d = parseDate(input);
  if (!d) return fallback;
  return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Alias for explicit date-only formatting.
 * @param {any} input
 * @param {any} [fallbackOrOptions]
 * @returns {string}
 */
export function formatDateOnly(input, fallbackOrOptions) {
  return formatDate(input, fallbackOrOptions);
}

/**
 * Standardized date & time formatter (e.g., "Jan 1, 2026, 12:00:00 AM").
 * @param {any} input
 * @param {any} [fallbackOrOptions]
 * @returns {string}
 */
export function formatDateTime(input, fallbackOrOptions) {
  let fallback = "N/A";
  let locale = "en-US";
  if (typeof fallbackOrOptions === "string") {
    fallback = fallbackOrOptions;
  } else if (fallbackOrOptions && typeof fallbackOrOptions === "object" && !fallbackOrOptions.hash) {
    if (fallbackOrOptions.fallback !== undefined) fallback = fallbackOrOptions.fallback;
    if (fallbackOrOptions.locale !== undefined) locale = fallbackOrOptions.locale;
  }
  const d = parseDate(input);
  if (!d) return fallback;
  return d.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Standardized date-time format in YYYY-MM-DD HH:mm:ss format (ideal for database logs/tokens).
 * @param {any} input
 * @returns {string}
 */
export function formatDateTimeIso(input) {
  const d = parseDate(input);
  if (!d) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Formats a date for HTML input type="date" (YYYY-MM-DD).
 * @param {any} input
 * @returns {string}
 */
export function formatDateInput(input) {
  const d = parseDate(input);
  if (!d) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Formats a date for HTML input type="datetime-local" (YYYY-MM-DDTHH:mm).
 * @param {any} input
 * @returns {string}
 */
export function formatDateTimeLocal(input) {
  const d = parseDate(input);
  if (!d) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Formats a date using toLocaleString with optional timezone name.
 * @param {any} input
 * @param {boolean} [withTimezone=false]
 * @returns {string}
 */
export function formatDateLocale(input, withTimezone = false) {
  const d = parseDate(input);
  if (!d) return "";
  return withTimezone
    ? d.toLocaleString("en-US", { timeZoneName: "short" })
    : d.toLocaleString();
}

/**
 * Relative time ago formatter (e.g. "Just now", "5 minutes ago", "2 days ago", or short "5m ago").
 * @param {any} input
 * @param {any} [fallbackOrOptions]
 * @returns {string}
 */
export function timeAgo(input, fallbackOrOptions) {
  let fallback = "";
  let isShort = false;
  if (typeof fallbackOrOptions === "string") {
    fallback = fallbackOrOptions;
  } else if (fallbackOrOptions && typeof fallbackOrOptions === "object" && !fallbackOrOptions.hash) {
    if (fallbackOrOptions.fallback !== undefined) fallback = fallbackOrOptions.fallback;
    if (fallbackOrOptions.short !== undefined) isShort = Boolean(fallbackOrOptions.short);
  }
  const d = parseDate(input);
  if (!d) return fallback;

  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 30) return "Just now";
  if (seconds < 60) return isShort ? `${seconds}s ago` : "Just now";

  const intervals = [
    ["year", "y", 31536000],
    ["month", "mo", 2592000],
    ["week", "w", 604800],
    ["day", "d", 86400],
    ["hour", "h", 3600],
    ["minute", "m", 60],
  ];

  for (const [unit, shortUnit, secs] of intervals) {
    const interval = Math.floor(seconds / secs);
    if (interval >= 1) {
      if (isShort) return `${interval}${shortUnit} ago`;
      return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
    }
  }
  return "Just now";
}

/**
 * Relative remaining time (e.g. "2d 4h remaining", "Expired").
 * @param {any} expire
 * @param {any} [fallbackOrOptions]
 * @returns {string}
 */
export function timeRemaining(expire, fallbackOrOptions) {
  let fallback = "";
  if (typeof fallbackOrOptions === "string") {
    fallback = fallbackOrOptions;
  } else if (fallbackOrOptions && typeof fallbackOrOptions === "object" && !fallbackOrOptions.hash) {
    if (fallbackOrOptions.fallback !== undefined) fallback = fallbackOrOptions.fallback;
  }
  const expireDate = parseDate(expire);
  if (!expireDate) return fallback;
  const diffMs = expireDate.getTime() - Date.now();
  if (diffMs <= 0) return "Expired";

  const diffDays = Math.floor(diffMs / 86400000);
  const diffHrs = Math.floor((diffMs % 86400000) / 3600000);
  const diffMins = Math.floor((diffMs % 3600000) / 60000);
  if (diffDays > 0) return `${diffDays}d ${diffHrs}h remaining`;
  if (diffHrs > 0) return `${diffHrs}h ${diffMins}m remaining`;
  return `${diffMins}m remaining`;
}

/**
 * Checks whether a date has passed.
 * @param {any} dateInput
 * @returns {boolean}
 */
export function isExpired(dateInput) {
  const d = parseDate(dateInput);
  return d ? d.getTime() < Date.now() : false;
}

/**
 * Checks whether a task/project deadline is overdue.
 * @param {any} deadline
 * @param {string} [status]
 * @returns {boolean}
 */
export function isOverdue(deadline, status) {
  if (!deadline || status === "Completed" || status === "Cancelled") return false;
  const d = parseDate(deadline);
  return d ? d.getTime() < Date.now() : false;
}

/**
 * Formats a duration in milliseconds to human-readable string.
 * @param {any} ms
 * @returns {string}
 */
export function formatDuration(ms) {
  const num = Number(ms);
  if (isNaN(num)) return "Invalid duration";
  if (num < 1000) return `${num.toFixed(2)} ms`;
  return `${(num / 1000).toFixed(2)} s`;
}
