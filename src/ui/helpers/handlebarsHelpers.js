/**
 * MBKUtils — Shared Handlebars Helpers for MBK Ecosystem
 */

import {
  toISOString,
  formatDate,
  formatDateOnly,
  formatDateTime,
  formatDateTimeIso,
  formatDateInput,
  formatDateTimeLocal,
  formatDateLocale,
  timeAgo,
  timeRemaining,
  isExpired,
  isOverdue,
  formatDuration,
} from "../../utils/dateTime.js";

const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const commonHandlebarsHelpers = {
  // Comparisons & Logic
  eq: (a, b) => a === b || (a != null && b != null && String(a) === String(b)),
  ne: (a, b) => a !== b && (a == null || b == null || String(a) !== String(b)),
  empty: (val) => (Array.isArray(val) ? val.length === 0 : val == null || val === "" || (typeof val === "object" ? Object.keys(val).length === 0 : !val)),
  notEmpty: (val) => (Array.isArray(val) ? val.length > 0 : val != null && val !== "" && (typeof val === "object" ? Object.keys(val).length > 0 : Boolean(val))),
  or: (...args) => { args.pop(); return args.some(Boolean); },
  and: (...args) => { args.pop(); return args.every(Boolean); },
  not: (val) => !val,
  gt: (a, b) => Number(a) > Number(b),
  gte: (a, b) => Number(a) >= Number(b),
  lt: (a, b) => Number(a) < Number(b),
  lte: (a, b) => Number(a) <= Number(b),

  ifCond: function (v1, operator, v2, options) {
    if (!options || typeof options.fn !== "function") return "";
    const ops = {
      "==": v1 == v2, "===": v1 === v2, "!=": v1 != v2, "!==": v1 !== v2,
      "<": Number(v1) < Number(v2), "<=": Number(v1) <= Number(v2),
      ">": Number(v1) > Number(v2), ">=": Number(v1) >= Number(v2),
      "&&": Boolean(v1 && v2), "||": Boolean(v1 || v2),
    };
    const result = Boolean(ops[operator]);
    return result ? options.fn(this) : (options.inverse ? options.inverse(this) : "");
  },

  ifGt: function (a, b, options) {
    const [na, nb] = [Number(a), Number(b)];
    const isGreater = !isNaN(na) && !isNaN(nb) ? na > nb : a > b;
    return isGreater ? (options?.fn ? options.fn(this) : true) : (options?.inverse ? options.inverse(this) : false);
  },

  includes: (arr, val) => (Array.isArray(arr) ? arr.includes(val) : arr === val),
  in: (value, list) => Array.isArray(list) && list.includes(parseInt(value, 10) || value),
  startsWith: (str, prefix) => typeof str === "string" && typeof prefix === "string" && str.startsWith(prefix),
  default: (...args) => {
    args.pop(); // remove Handlebars options hash
    for (const arg of args) {
      if (arg !== undefined && arg !== null && arg !== "" && !(typeof arg === "number" && isNaN(arg))) {
        return arg;
      }
    }
    return "";
  },

  // Strings & Text
  trim: (str) => (str ? String(str).trim() : ""),
  truncate: (str, maxLen = 100) => {
    if (str == null) return "";
    const s = String(str);
    return s.length <= maxLen ? s : `${s.substring(0, maxLen)}...`;
  },
  truncateUrl: (str, maxLen = 45) => {
    if (!str || typeof str !== "string" || str.length <= maxLen) return str || "";
    return `${str.substring(0, Math.floor(maxLen * 0.6))}...${str.substring(str.length - Math.floor(maxLen * 0.3))}`;
  },
  slug: (str) => (str ? String(str).toLowerCase().replace(/\s+/g, "-") : ""),
  capitalize: (str) => (str ? String(str).charAt(0).toUpperCase() + String(str).slice(1) : ""),
  lower: (str) => (str ? String(str).toLowerCase() : ""),
  upper: (str) => (str ? String(str).toUpperCase() : ""),
  slice: (str, start, end) => (str ? String(str).slice(start, end) : ""),
  escapeHtml: (input) => (input == null ? "" : String(input).replace(/[&<>"']/g, (c) => HTML_ESCAPE_MAP[c] || c)),
  length: (val) => (val && typeof val.length === "number" ? val.length : 0),
  join: (arr, sep = ", ") => (Array.isArray(arr) ? arr.join(sep) : arr || ""),
  encodeURIComponent: (str) => encodeURIComponent(str || ""),

  // Numbers & Formatting
  formatNumber: (num) => {
    if (num == null || num === "") return "0";
    const n = Number(num);
    if (isNaN(n)) return "0";
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
    return n.toLocaleString();
  },

  formatBytes: (bytes, decimals = 2) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  },

  formatDuration,

  // Date & Time
  toISOString,
  formatDate,
  formatDateOnly,
  formatDateTime,
  formatDateTimeIso,
  formatDateInput,
  formatDateTimeLocal,
  formatDateLocale,
  timeAgo,
  timeRemaining,
  isExpired,
  isOverdue,

  // JSON & Objects
  jsonStringify: (context) => JSON.stringify(context),
  jsonParse: (str) => {
    if (!str) return {};
    try { return typeof str === "string" ? JSON.parse(str) : str; } catch { return {}; }
  },
  jsonIncludes: (jsonArray, value) => {
    if (!jsonArray) return false;
    try {
      const arr = Array.isArray(jsonArray) ? jsonArray : JSON.parse(jsonArray);
      return Array.isArray(arr) && arr.includes(value);
    } catch { return false; }
  },
  objectEntries: (obj) => (obj && typeof obj === "object" ? Object.entries(obj).map(([key, value]) => ({ key, value })) : []),
  array: (...args) => { args.pop(); return args; },
  index: (arr, idx) => (arr ? arr[idx] : null),

  // Math & Ranges
  add: (a, b) => Number(a) + Number(b),
  subtract: (a, b) => Number(a) - Number(b),
  multiply: (a, b) => Number(a) * Number(b),
  min: (a, b) => Math.min(Number(a), Number(b)),
  max: (a, b) => Math.max(Number(a), Number(b)),
  range: (start, end) => {
    const [s, e] = [Number(start), Number(end)];
    return isNaN(s) || isNaN(e) || e < s ? [] : Array.from({ length: e - s + 1 }, (_, i) => s + i);
  },
  validPageRange: (current, total, delta = 2) => {
    const [c, t, d] = [Number(current) || 1, Number(total) || 1, Number(delta) || 2];
    const start = Math.max(1, c - d);
    const end = Math.min(t, c + d);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  },
  for: function (from, to, block) {
    let accum = "";
    for (let i = from; i <= to; ++i) accum += block.fn(i);
    return accum;
  },

  // URL & Domain & Cache
  extractDomain: (urlString) => {
    try {
      if (!urlString) return "";
      return new URL(urlString.startsWith("http") ? urlString : `https://${urlString}`).hostname.replace(/^www\./, "");
    } catch { return urlString || ""; }
  },
  extractOriginalUrl: (shortUrlObj) => (typeof shortUrlObj === "object" && shortUrlObj?.original_url ? shortUrlObj.original_url : shortUrlObj),
  getCanonicalUrl: (req, path) => {
    if (!req) return path || "";
    return `${req.protocol || "https"}://${(typeof req.get === "function" ? req.get("host") : req.host) || "mbktech.org"}${path || ""}`;
  },
  conditionalEnv: (trueResult, falseResult) => (process.env.localenv ? trueResult : falseResult),
  cacheBust: (version) => {
    const v = version && typeof version === "string" ? version : (process.env.APP_VERSION || process.env.npm_package_version || "1.0.0");
    return `?v=${v}`;
  },

  // UI Badges & Metadata
  getInitials: (username) => {
    if (!username) return "?";
    const parts = String(username).split(/[._\s]/).filter(Boolean);
    return parts.length ? parts.map((p) => p.charAt(0)).join("").toUpperCase().slice(0, 2) : "?";
  },

  getDeviceIcon: (ua) => {
    if (!ua) return "fas fa-question";
    if (/mobile/i.test(ua)) return "fas fa-mobile-alt";
    if (/tablet/i.test(ua)) return "fas fa-tablet-alt";
    return "fas fa-desktop";
  },

  getBrowser: (ua) => {
    if (!ua) return "Unknown";
    for (const name of ["Chrome", "Firefox", "Safari", "Edge", "Opera"]) {
      if (new RegExp(name, "i").test(ua)) return name;
    }
    return "Unknown Browser";
  },

  getOS: (ua) => {
    if (!ua) return "Unknown OS";
    if (/windows/i.test(ua)) return "Windows";
    if (/macintosh/i.test(ua)) return "MacOS";
    if (/linux/i.test(ua)) return "Linux";
    if (/android/i.test(ua)) return "Android";
    if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
    return "Unknown OS";
  },

  actionTypeBadgeClass: (actionType) => {
    if (!actionType) return "action-default";
    const t = String(actionType).toLowerCase();
    if (t.includes("success") || t.includes("page view") || t === "page accessed" || t === "general success") return "action-success";
    if (t.includes("redirect")) return "action-redirect";
    if (t.includes("client error") || t.includes("not found") || t.includes("forbidden") || t.includes("unauthorized")) return "action-client";
    if (t.includes("server error") || t.includes("unavailable")) return "action-server";
    if (["login", "logout", "view", "create", "update", "delete"].includes(t)) return `action-${t}`;
    return "action-default";
  },

  section: function (name, options) {
    if (!this._sections) this._sections = {};
    if (options && typeof options.fn === "function") this._sections[name] = options.fn(this);
    return null;
  },
};

export default commonHandlebarsHelpers;
