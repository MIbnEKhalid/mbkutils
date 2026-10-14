/**
 * Extracts normalized user context information from an Express request object or cookies.
 * @param {import("express").Request | null} [req]
 */
export function getUserContext(req) {
  const user = req?.session?.user || req?.auth?.user;
  const cookieUsername = req?.cookies?.username;
  const cookieFullName = req?.cookies?.full_name;

  if (user?.username) {
    return {
      userLoggedIn: true,
      user_id: user.user_id || "mbk_notfound",
      username: user.username,
      full_name: user.full_name || user.username,
      role: user.role || "N/A",
      allowed_apps: Array.isArray(user.allowed_apps) ? user.allowed_apps : [],
    };
  }

  if (cookieUsername && typeof cookieUsername === "string" && cookieUsername.trim()) {
    const cleanUsername = cookieUsername.trim();
    return {
      userLoggedIn: true,
      user_id: "mbk_notfound",
      username: cleanUsername,
      full_name: (cookieFullName && typeof cookieFullName === "string") ? cookieFullName.trim() : cleanUsername,
      role: "N/A",
      allowed_apps: [],
    };
  }

  if (cookieFullName && typeof cookieFullName === "string" && cookieFullName.trim()) {
    const cleanFullName = cookieFullName.trim();
    return {
      userLoggedIn: true,
      user_id: "mbk_notfound",
      username: cleanFullName,
      full_name: cleanFullName,
      role: "N/A",
      allowed_apps: [],
    };
  }

  return {
    userLoggedIn: false,
    user_id: "mbk_notfound",
    username: "N/A",
    full_name: "N/A",
    role: "N/A",
    allowed_apps: [],
  };
}

/**
 * Redacts passwords, API tokens, session secrets, private keys, and authorization headers from error details.
 * @param {unknown} details
 * @returns {string | null}
 */
export function sanitizeErrorDetails(details) {
  if (!details) return null;
  const str = typeof details === "string" ? details : (details?.stack || details?.message || (typeof details === "object" ? JSON.stringify(details, null, 2) : String(details)));

  return str
    .replace(/(["']?(?:password|passwd|pwd|secret|token|apiKey|api_key|clientSecret|client_secret|authHeader|accessToken|access_token|refreshToken|refresh_token|privateKey|private_key|main_secret_token|db_password|session_secret)["']?\s*[:=]\s*["']?)([^"',\s\r\n}]+)(["']?)/gi, "$1[REDACTED]$3")
    .replace(/(Bearer\s+)[A-Za-z0-9_\-\.]+/gi, "$1[REDACTED]")
    .replace(/(Basic\s+)[A-Za-z0-9+/=]+/gi, "$1[REDACTED]")
    .replace(/([a-zA-Z0-9+.-]+:\/\/[^:]+:)([^@\s]+)(@)/g, "$1[REDACTED]$3")
    .replace(/(sessionId|connect\.sid|session_id|jwt)=([^;\s&]+)/gi, "$1=[REDACTED]")
    .replace(/-----BEGIN[ A-Z_-]+KEY-----[\s\S]+?-----END[ A-Z_-]+KEY-----/g, "[REDACTED_PRIVATE_KEY]");
}

function resolveRequestId(options = {}) {
  if (options.requestId) return options.requestId;
  if (!options.req) return undefined;
  const headerId = options.req.headers?.["x-request-id"] || options.req.headers?.["x-correlation-id"];
  if (typeof headerId === "string") return headerId;
  return options.req.id || options.req.requestId;
}

function resolveDurationMs(req) {
  if (!req) return undefined;
  const start = req._startTime || req.startTime;
  if (typeof start === "number") return Date.now() - start;
  if (start instanceof Date) return Date.now() - start.getTime();
  return undefined;
}

/**
 * Sends a standardized successful JSON response envelope.
 * @param {import("express").Response} res
 * @param {any} [data=null]
 * @param {Record<string, any>} [options={}]
 */
export function sendSuccess(res, data = null, options = {}) {
  const { statusCode = 200, message = undefined, req, res: _res, ...extra } = options;
  const requestId = resolveRequestId({ req, requestId: options.requestId });
  const durationMs = resolveDurationMs(req);

  const envelope = {
    success: true,
    ...(message && { message }),
    ...(data !== null && data !== undefined && { data }),
    ...(requestId && { requestId }),
    ...(durationMs !== undefined && { durationMs }),
    timestamp: new Date().toISOString(),
    ...extra,
  };
  if (data && typeof data === "object" && !Array.isArray(data)) {
    Object.assign(envelope, data);
  }
  return res.status(statusCode).json(envelope);
}

/**
 * Sends a standardized error JSON response envelope.
 * @param {import("express").Response} res
 * @param {any} errorInput
 * @param {Record<string, any>} [options={}]
 */
export function sendError(res, errorInput, options = {}) {
  const { statusCode = 500, details = undefined, errorCode = undefined, req, res: _res, ...extra } = options;
  let code = errorCode || options.code || (statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST");
  let message = "An unexpected error occurred";
  let rawDetails = details;
  const requestId = resolveRequestId({ req, requestId: options.requestId });
  const durationMs = resolveDurationMs(req);

  if (typeof errorInput === "string") {
    message = errorInput;
  } else if (typeof errorInput === "number") {
    code = errorCode || errorInput;
    message = `Error code ${errorInput}`;
    rawDetails = details;
  } else if (errorInput instanceof Error) {
    message = errorInput.message || message;
    if (!rawDetails && process.env.NODE_ENV !== "production") rawDetails = errorInput.stack;
  } else if (errorInput && typeof errorInput === "object") {
    message = errorInput.message || errorInput.error || message;
    code = errorInput.code || errorInput.errorCode || code;
    rawDetails = errorInput.details || errorInput.hint || details;
  }

  const sanitizedDetails = rawDetails ? sanitizeErrorDetails(rawDetails) : undefined;
  const envelope = {
    success: false,
    error: {
      code,
      message,
      ...(sanitizedDetails !== undefined && { details: sanitizedDetails }),
    },
    message,
    ...(typeof code === "number" || errorCode !== undefined ? { errorCode: typeof code === "number" ? code : errorCode } : {}),
    ...(requestId && { requestId }),
    ...(durationMs !== undefined && { durationMs }),
    timestamp: new Date().toISOString(),
    ...extra,
  };
  return res.status(statusCode).json(envelope);
}

/**
 * Renders the universal error page with optional diagnostics.
 * @param {import("express").Response} res
 * @param {import("express").Request} req
 * @param {Record<string, any>} options
 */
export const renderError = (res, req, { code, error, message, page, pagename, details, app, version }) => {
  res.status(parseInt(String(code), 10));
  const sanitizedDetails = details !== undefined && details !== null ? sanitizeErrorDetails(details) : undefined;
  const appName = app || (process.env.APP_NAME || "mbktech");
  const appVersion = version || (process.env.npm_package_version || "1.0.0");

  return res.render("Error/mbkutils_dError.hbs", {
    layout: false,
    code,
    error,
    message,
    page,
    pagename,
    app: appName,
    version: appVersion,
    ...getUserContext(req),
    ...(sanitizedDetails !== undefined && { details: sanitizedDetails }),
  });
};

/**
 * Renders an HTML view template with injected user context and standard layout parameters.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {string} fileLocation
 * @param {boolean | string} [layout=true]
 * @param {Record<string, any>} [data={}]
 */
export async function renderPage(
  req,
  res,
  fileLocation,
  layout = true,
  data = {}
) {
  const sessionUser = req?.session?.user || req?.auth?.user || null;
  const userCtx = getUserContext(req);
  const userLoggedIn = userCtx.userLoggedIn || Boolean(data.userLoggedIn);
  const username = userCtx.userLoggedIn ? userCtx.username : (data.username || userCtx.username);

  const layoutOption = typeof layout === "string" ? { layout } : (layout === false ? { layout: false } : {});

  return res.render(fileLocation, {
    sessionUser,
    isuserlogin: Boolean(sessionUser),
    ...userCtx,
    ...data,
    userLoggedIn,
    username,
    ...layoutOption,
  });
}
