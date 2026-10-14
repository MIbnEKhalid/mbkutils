/**
 * MBKUtils — Shared Utilities, Response Formatters, Handlebars Helpers & UI Components for MBK Ecosystem
 * Copyright (c) 2026 Muhammad Bin Khalid, MBKTech.org and contributors
 * Licensed under the MIT License.
 * Source: https://github.com/MIbnEKhalid/mbkutils
 */

// 1. HTTP Response, Formatters & Handlers
export {
  isJsonRequest,
} from "./response/contentNegotiation.js";

export {
  getUserContext,
  sanitizeErrorDetails,
  sendSuccess,
  sendError,
  renderError,
  renderPage,
} from "./response/formatters.js";

export {
  createErrorHandler,
  createNotFoundHandler,
  proxycall,
} from "./response/handlers.js";

// 2. Middleware & Rate Limiting
export {
  createRateLimiter,
} from "./middleware/rateLimiter.js";

// 3. Handlebars & UI Helpers, View Engine & Paths
export {
  commonHandlebarsHelpers,
  resolveParentProjectVersion,
  setParentProjectVersion,
  resolvePackageVersion,
  registerPackageVersion,
  getPackageVersion,
} from "./ui/helpers/handlebarsHelpers.js";

export {
  setupViewEngine,
} from "./ui/viewEngine.js";

export {
  viewsDir,
  publicDir,
  mbkutilsViewsDir,
  mbkutilsPublicDir,
} from "./ui/paths.js";

// 4. General Utilities: Text, String & Path
export {
  escapeHtml,
  escapeLikePattern,
  escapeJavaScriptString,
  truncateText,
  toPosixPath,
  getBaseName,
  getFileExt,
  trimSlashes,
  trimLeadingSlashes,
} from "./utils/text.js";

// 5. Data & JSON Utilities
export {
  safeParseJSON,
} from "./utils/json.js";

// 6. Cryptography & Token Utilities
export {
  generateRandomHex,
  sha256,
  timingSafeEqual,
} from "./utils/crypto.js";

// 7. Security, Navigation & URL Utilities
export {
  isSafeFetchUrl,
} from "./utils/urlSafety.js";

export {
  isSafeRelativeRedirect,
  sanitizeRelativeRedirect,
} from "./utils/redirect.js";

export {
  createLogger,
  logDebug,
} from "./utils/logger.js";

// 8. Date & Time Utilities
export {
  parseDate,
  nowIso,
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
} from "./utils/dateTime.js";

// 9. Default aggregated export object
import { isJsonRequest } from "./response/contentNegotiation.js";
import { getUserContext, sanitizeErrorDetails, sendSuccess, sendError, renderError, renderPage } from "./response/formatters.js";
import { createErrorHandler, createNotFoundHandler, proxycall } from "./response/handlers.js";
import { createRateLimiter } from "./middleware/rateLimiter.js";
import {
  commonHandlebarsHelpers,
  resolveParentProjectVersion,
  setParentProjectVersion,
  resolvePackageVersion,
  registerPackageVersion,
  getPackageVersion,
} from "./ui/helpers/handlebarsHelpers.js";
import { setupViewEngine } from "./ui/viewEngine.js";
import { viewsDir, publicDir, mbkutilsViewsDir, mbkutilsPublicDir } from "./ui/paths.js";
import {
  escapeHtml,
  escapeLikePattern,
  escapeJavaScriptString,
  truncateText,
  toPosixPath,
  getBaseName,
  getFileExt,
  trimSlashes,
  trimLeadingSlashes,
} from "./utils/text.js";
import { safeParseJSON } from "./utils/json.js";
import { generateRandomHex, sha256, timingSafeEqual } from "./utils/crypto.js";
import { isSafeFetchUrl } from "./utils/urlSafety.js";
import { isSafeRelativeRedirect, sanitizeRelativeRedirect } from "./utils/redirect.js";
import { createLogger, logDebug } from "./utils/logger.js";
import {
  parseDate,
  nowIso,
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
} from "./utils/dateTime.js";

export const mbkutils = {
  isJsonRequest,
  getUserContext,
  sanitizeErrorDetails,
  sendSuccess,
  sendError,
  renderError,
  renderPage,
  createErrorHandler,
  createNotFoundHandler,
  proxycall,
  createRateLimiter,
  commonHandlebarsHelpers,
  resolveParentProjectVersion,
  setParentProjectVersion,
  resolvePackageVersion,
  registerPackageVersion,
  getPackageVersion,
  setupViewEngine,
  viewsDir,
  publicDir,
  mbkutilsViewsDir,
  mbkutilsPublicDir,
  escapeHtml,
  escapeLikePattern,
  escapeJavaScriptString,
  truncateText,
  toPosixPath,
  getBaseName,
  getFileExt,
  trimSlashes,
  trimLeadingSlashes,
  safeParseJSON,
  generateRandomHex,
  sha256,
  timingSafeEqual,
  isSafeFetchUrl,
  isSafeRelativeRedirect,
  sanitizeRelativeRedirect,
  createLogger,
  logDebug,
  parseDate,
  nowIso,
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
};

export default mbkutils;
