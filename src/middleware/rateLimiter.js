/**
 * MBKUtils — Express Rate Limiter Middleware Factory
 */

import rateLimit from "express-rate-limit";
import { isJsonRequest } from "../response/contentNegotiation.js";
import { sendError, renderPage, renderError } from "../response/formatters.js";

/**
 * Creates an Express rate limiting middleware with automatic content-negotiation.
 * Returns standardized JSON error responses for API/fetch clients, and renders
 * an error template or standard error page for browser HTML navigations.
 * @param {Record<string, any>} [options]
 */
export function createRateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000,
    max = 100,
    statusCode = 429,
    message = "Too many requests from this IP, please try again later.",
    code = "RATE_LIMITED",
    errorView,
    errorLayout = false,
    standardHeaders = true,
    legacyHeaders = false,
    handler,
    ...restOptions
  } = options;

  const defaultHandler = (req, res, _next) => {
    const retryAfter = Math.ceil(windowMs / 1000);
    if (!res.headersSent) {
      res.setHeader("Retry-After", String(retryAfter));
      res.status(statusCode);
    }

    const errorMsg =
      typeof message === "string"
        ? message
        : message?.error?.message ||
          message?.error ||
          message?.message ||
          "Too many requests from this IP, please try again later.";

    if (isJsonRequest(req)) {
      return sendError(res, errorMsg, {
        statusCode,
        code,
        req,
      });
    }

    if (errorView) {
      return renderPage(req, res, errorView, errorLayout, {
        title: "429 - Too Many Requests",
        code: statusCode,
        message: errorMsg,
        currentYear: new Date().getFullYear(),
      });
    }

    return renderError(res, req, {
      code: statusCode,
      error: "Too Many Requests",
      message: errorMsg,
    });
  };

  return rateLimit({
    windowMs,
    max,
    statusCode,
    standardHeaders,
    legacyHeaders,
    handler: handler || defaultHandler,
    ...restOptions,
  });
}

export default createRateLimiter;
