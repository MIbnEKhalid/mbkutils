import { isJsonRequest } from "./contentNegotiation.js";
import { sendError, renderError } from "./formatters.js";

/**
 * Creates a centralized Express error handling middleware.
 * @param {Record<string, any>} [options]
 */
export function createErrorHandler(options = {}) {
  const { appName = process.env.APP_NAME || "mbktech", defaultPage = "/", defaultPageName = "Home" } = options;

  return (err, req, res, next) => {
    if (res.headersSent) return next(err);

    const statusCode = Number(err.status || err.statusCode || 500);
    const isClientError = statusCode >= 400 && statusCode < 500;
    if (!isClientError) console.error(`[${appName}] Unhandled error:`, err?.stack || err);

    if (isJsonRequest(req)) {
      return sendError(res, err, { statusCode, details: process.env.NODE_ENV !== "production" ? err.stack : undefined });
    }

    return renderError(res, req, {
      code: statusCode,
      error: isClientError ? (err.name || "Client Error") : "Internal App Error",
      message: err.message || (isClientError ? "The request could not be processed." : "An unexpected error occurred on the app."),
      details: err.message,
      pagename: defaultPageName,
      page: defaultPage,
      app: appName,
    });
  };
}

/**
 * Creates a centralized Express 404 Not Found route handler.
 * @param {Record<string, any>} [options]
 */
export function createNotFoundHandler(options = {}) {
  const { defaultPage = "/mbkauthe/login", defaultPageName = "Login Portal" } = options;

  return (req, res) => {
    if (req.path?.startsWith("/Assets/") || req.path?.startsWith("/assets/")) return res.status(404).end();
    if (isJsonRequest(req)) {
      return sendError(res, `The requested route '${req.originalUrl}' was not found.`, { statusCode: 404, code: "ROUTE_NOT_FOUND", req });
    }
    return renderError(res, req, {
      code: 404,
      error: "Page Not Found",
      message: `The requested URL '${req.originalUrl}' was not found on this server.`,
      pagename: defaultPageName,
      page: defaultPage,
    });
  };
}

/**
 * Proxies an HTTP request to another target URL with session forwarding.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {string} url
 * @param {string} [method="GET"]
 * @param {Record<string, string>} [headerOption={}]
 */
export async function proxycall(req, res, url, method = "GET", headerOption = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const sessionCookie = req.cookies?.session_id;
    const headers = { ...headerOption };
    if (sessionCookie && !headers.Cookie) headers.Cookie = `session_id=${sessionCookie}`;

    const isGetOrHead = ["GET", "HEAD"].includes(method);
    const body = isGetOrHead ? undefined : (typeof req.body === "string" || Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body));
    if (body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

    const response = await fetch(url, { method, headers, body, signal: controller.signal });
    response.headers.forEach((value, key) => res.setHeader(key, value));

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await response.json() : await response.text();
    return res.status(response.status).send(data);
  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(err.name === "AbortError" ? 504 : 500).json({ error: "Proxy request failed" });
  } finally {
    clearTimeout(timeout);
  }
}
