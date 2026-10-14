import { describe, it, expect } from "vitest";
import express from "express";
import {
  isJsonRequest,
  sendSuccess,
  sendError,
  getUserContext,
  sanitizeErrorDetails,
  createErrorHandler,
  createNotFoundHandler,
  commonHandlebarsHelpers,
  isSafeFetchUrl,
  isSafeRelativeRedirect,
  sanitizeRelativeRedirect,
  createLogger,
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
  setupViewEngine,
  createRateLimiter,
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
} from "../src/index.js";

describe("Content Negotiation (isJsonRequest)", () => {
  it("returns true for req with application/json accept header", () => {
    const req = { get: (header) => (header === "accept" ? "application/json" : "") };
    expect(isJsonRequest(req)).toBe(true);
  });

  it("returns true for /api/ routes", () => {
    const req = { path: "/api/test", get: () => "" };
    expect(isJsonRequest(req)).toBe(true);
  });

  it("returns false for regular HTML page requests", () => {
    const req = { path: "/login", get: () => "text/html" };
    expect(isJsonRequest(req)).toBe(false);
  });
});

describe("Response Formatters", () => {
  it("sendSuccess generates valid envelope", () => {
    let capturedStatus = 0;
    let capturedJson = null;
    const res = {
      status: (code) => {
        capturedStatus = code;
        return res;
      },
      json: (data) => {
        capturedJson = data;
        return res;
      },
    };

    sendSuccess(res, { item: "ok" }, { message: "Created successfully", statusCode: 201 });
    expect(capturedStatus).toBe(201);
    expect(capturedJson.success).toBe(true);
    expect(capturedJson.message).toBe("Created successfully");
    expect(capturedJson.item).toBe("ok");
    expect(capturedJson.timestamp).toBeDefined();
  });

  it("sendError redacts sensitive details", () => {
    let capturedStatus = 0;
    let capturedJson = null;
    const res = {
      status: (code) => {
        capturedStatus = code;
        return res;
      },
      json: (data) => {
        capturedJson = data;
        return res;
      },
    };

    sendError(res, "Database error", { statusCode: 500, details: "password=supersecret and token=12345" });
    expect(capturedStatus).toBe(500);
    expect(capturedJson.success).toBe(false);
    expect(capturedJson.error.details).toContain("[REDACTED]");
    expect(capturedJson.error.details).not.toContain("supersecret");
  });

  it("sanitizeErrorDetails handles various sensitive tokens", () => {
    const raw = "Connecting to postgres://user:secret123@db.internal:5432 with Bearer eyJhbGciOi";
    const sanitized = sanitizeErrorDetails(raw);
    expect(sanitized).toContain("[REDACTED]");
    expect(sanitized).not.toContain("secret123");
  });

  it("getUserContext extracts user from session and cookie fallback", () => {
    expect(getUserContext(null).userLoggedIn).toBe(false);
    expect(getUserContext({ session: { user: { username: "khalid", role: "admin" } } }).username).toBe("khalid");
    expect(getUserContext({ cookies: { username: "guest_user" } }).username).toBe("guest_user");
  });
});

describe("URL & Redirect Safety", () => {
  it("blocks private IPs and internal hostnames in isSafeFetchUrl", () => {
    expect(isSafeFetchUrl("http://localhost:3000/test")).toBe(false);
    expect(isSafeFetchUrl("http://127.0.0.1/admin")).toBe(false);
    expect(isSafeFetchUrl("http://192.168.1.1/info")).toBe(false);
    expect(isSafeFetchUrl("http://metadata.google.internal")).toBe(false);
    expect(isSafeFetchUrl("https://mbktech.org/logo.png")).toBe(true);
  });

  it("validates relative redirects correctly", () => {
    expect(isSafeRelativeRedirect("/dashboard")).toBe(true);
    expect(isSafeRelativeRedirect("//evil.com")).toBe(false);
    expect(isSafeRelativeRedirect("https://evil.com")).toBe(false);
    expect(isSafeRelativeRedirect("/dashboard\\evil")).toBe(false);
    expect(sanitizeRelativeRedirect("//evil.com", "/fallback")).toBe("/fallback");
  });
});

describe("Handlebars Helpers", () => {
  it("formats numbers properly", () => {
    expect(commonHandlebarsHelpers.formatNumber(1500)).toBe("1.5k");
    expect(commonHandlebarsHelpers.formatNumber(2500000)).toBe("2.5M");
    expect(commonHandlebarsHelpers.formatBytes(1048576)).toBe("1 MB");
  });

  it("handles string manipulations and casing helpers", () => {
    expect(commonHandlebarsHelpers.slug("Hello World App")).toBe("hello-world-app");
    expect(commonHandlebarsHelpers.capitalize("superadmin")).toBe("Superadmin");
    expect(commonHandlebarsHelpers.truncate("abcdefghij", 5)).toBe("abcde...");
    expect(commonHandlebarsHelpers.lower("FOOBAR")).toBe("foobar");
    expect(commonHandlebarsHelpers.upper("foobar")).toBe("FOOBAR");
    expect(commonHandlebarsHelpers.slice("hello world", 0, 5)).toBe("hello");
    expect(commonHandlebarsHelpers.escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
    );
  });

  it("handles comparisons and emptiness helpers", () => {
    expect(commonHandlebarsHelpers.eq("1", 1)).toBe(true);
    expect(commonHandlebarsHelpers.ne("1", "2")).toBe(true);
    expect(commonHandlebarsHelpers.ne(1, 1)).toBe(false);
    expect(commonHandlebarsHelpers.empty([])).toBe(true);
    expect(commonHandlebarsHelpers.empty(["item"])).toBe(false);
    expect(commonHandlebarsHelpers.empty("")).toBe(true);
    expect(commonHandlebarsHelpers.empty(null)).toBe(true);
    expect(commonHandlebarsHelpers.notEmpty(["item"])).toBe(true);
    expect(commonHandlebarsHelpers.notEmpty([])).toBe(false);
    expect(commonHandlebarsHelpers.notEmpty("text")).toBe(true);
    expect(commonHandlebarsHelpers.gt(10, 5)).toBe(true);
  });

  it("formats dates, timestamps, cacheBust (parent) and cachebust (package)", () => {
    expect(commonHandlebarsHelpers.formatDate("2026-01-01T00:00:00Z")).toBeDefined();
    expect(commonHandlebarsHelpers.formatDate("")).toBe("N/A");
    expect(commonHandlebarsHelpers.formatDateOnly("2026-01-01T00:00:00Z")).toContain("2026");
    expect(commonHandlebarsHelpers.formatDateOnly("")).toBe("N/A");
    // Explicit override
    expect(commonHandlebarsHelpers.cacheBust("2.4.0")).toBe("?v=2.4.0");
    expect(commonHandlebarsHelpers.cachebust("3.1.0")).toBe("?v=3.1.0");
    // Parent project dynamic package.json version
    expect(commonHandlebarsHelpers.cacheBust()).toMatch(/^\?v=\d+\.\d+\.\d+/);
    // Package cachebust helper (1 char different from parent project helper)
    expect(commonHandlebarsHelpers.cachebust()).toMatch(/^\?v=\d+\.\d+\.\d+/);
    // Package argument in cachebust
    commonHandlebarsHelpers.acachebust();
    expect(commonHandlebarsHelpers.cachebust("mbkauthe")).toMatch(/^\?v=\d+\.\d+\.\d+/);
    expect(commonHandlebarsHelpers.cachebust("mbkbucket")).toMatch(/^\?v=\d+\.\d+\.\d+/);
    expect(commonHandlebarsHelpers.cachebust("mbkutils")).toMatch(/^\?v=\d+\.\d+\.\d+/);
    // Dedicated package helpers
    expect(commonHandlebarsHelpers.acachebust()).toMatch(/^\?v=\d+\.\d+\.\d+/);
    expect(commonHandlebarsHelpers.bcachebust()).toMatch(/^\?v=\d+\.\d+\.\d+/);
    expect(commonHandlebarsHelpers.ucachebust()).toMatch(/^\?v=\d+\.\d+\.\d+/);
    expect(commonHandlebarsHelpers.acachebust("6.0.0")).toBe("?v=6.0.0");
    expect(commonHandlebarsHelpers.bcachebust("4.0.0")).toBe("?v=4.0.0");
    expect(commonHandlebarsHelpers.ucachebust("1.0.0")).toBe("?v=1.0.0");
  });

  it("extracts device and browser metadata", () => {
    expect(commonHandlebarsHelpers.getInitials("Muhammad Khalid")).toBe("MK");
    expect(commonHandlebarsHelpers.getBrowser("Mozilla/5.0 Chrome/120.0")).toBe("Chrome");
    expect(commonHandlebarsHelpers.getOS("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("Windows");
  });
});

describe("General String & Text Utilities", () => {
  it("escapes HTML correctly", () => {
    expect(escapeHtml("<b>'Hello' & \"World\"</b>")).toBe("&lt;b&gt;&#39;Hello&#39; &amp; &quot;World&quot;&lt;/b&gt;");
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(123)).toBe("123");
  });

  it("escapes SQL LIKE patterns correctly", () => {
    expect(escapeLikePattern("100%")).toBe("100\\%");
    expect(escapeLikePattern("a_b")).toBe("a\\_b");
    expect(escapeLikePattern("test\\case")).toBe("test\\\\case");
    expect(escapeLikePattern("hello")).toBe("hello");
  });

  it("escapes JavaScript strings safely", () => {
    expect(escapeJavaScriptString("line 1\nline 2\r\t'quote' and \"double\"")).toBe(
      "line 1\\nline 2\\r\\t\\'quote\\' and \\\"double\\\""
    );
    expect(escapeJavaScriptString("")).toBe("");
    expect(escapeJavaScriptString(null)).toBe("");
  });

  it("truncates text with fallback support", () => {
    expect(truncateText("Short text", 20)).toBe("Short text");
    expect(truncateText("This is a long sentence that needs truncating", 10)).toBe("This is a ...");
    expect(truncateText("", 10, "No content")).toBe("No content");
    expect(truncateText(null, 10)).toBe("-");
  });

  it("converts paths to POSIX slashes", () => {
    expect(toPosixPath("C:\\Users\\admin\\file.txt")).toBe("C:/Users/admin/file.txt");
    expect(toPosixPath("folder/subfolder/file.txt")).toBe("folder/subfolder/file.txt");
  });

  it("extracts base name and file extensions", () => {
    expect(getBaseName("folder/sub/file.txt")).toBe("file.txt");
    expect(getBaseName("file.txt")).toBe("file.txt");
    expect(getBaseName("folder/sub/")).toBe("");
    expect(getBaseName("")).toBe("");
    expect(getBaseName(null)).toBe("");

    expect(getFileExt("folder/sub/file.TXT")).toBe("txt");
    expect(getFileExt("document.pdf")).toBe("pdf");
    expect(getFileExt("noext")).toBe("");
    expect(getFileExt("")).toBe("");
  });

  it("trims slashes cleanly", () => {
    expect(trimSlashes("/path/to/resource/")).toBe("path/to/resource");
    expect(trimSlashes("///clean///")).toBe("clean");
    expect(trimLeadingSlashes("/path/to/resource")).toBe("path/to/resource");
    expect(trimLeadingSlashes("path/to/resource/")).toBe("path/to/resource/");
  });
});

describe("Safe Data Parsing & Serialization (safeParseJSON)", () => {
  it("parses valid JSON string", () => {
    expect(safeParseJSON('{"name":"Alice","age":30}')).toEqual({ name: "Alice", age: 30 });
  });

  it("returns fallback for invalid JSON string", () => {
    expect(safeParseJSON("invalid json", { fallback: true })).toEqual({ fallback: true });
    expect(safeParseJSON("{malformed:", [])).toEqual([]);
  });

  it("handles non-string / already parsed objects", () => {
    const obj = { already: "parsed" };
    expect(safeParseJSON(obj)).toBe(obj);
    expect(safeParseJSON(null, { default: 1 })).toEqual({ default: 1 });
    expect(safeParseJSON("", "empty")).toBe("empty");
  });
});

describe("Crypto & Token Helpers", () => {
  it("generates random hex strings of expected byte length", () => {
    const hex32 = generateRandomHex(32);
    expect(hex32).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hex32)).toBe(true);

    const hex16 = generateRandomHex(16);
    expect(hex16).toHaveLength(32);
  });

  it("computes sha256 hashes", () => {
    const hash = sha256("test-string");
    expect(hash).toHaveLength(64);
    expect(hash).toBe("ffe65f1d98fafedea3514adc956c8ada5980c6c5d2552fd61f48401aefd5c00e");
  });

  it("performs timing-safe equality comparisons", () => {
    const a = "supersecrettoken123";
    const b = "supersecrettoken123";
    const c = "differenttoken12345";
    const d = "supersecrettoken1234";

    expect(timingSafeEqual(a, b)).toBe(true);
    expect(timingSafeEqual(a, c)).toBe(false);
    expect(timingSafeEqual(a, d)).toBe(false);
    expect(timingSafeEqual(a, null)).toBe(false);
    expect(timingSafeEqual(null, null)).toBe(false);
    expect(timingSafeEqual(Buffer.from(a), Buffer.from(b))).toBe(true);
  });
});

describe("View Engine Setup (setupViewEngine)", () => {
  it("configures express-handlebars on an express app", () => {
    const app = express();
    const result = setupViewEngine(app, {
      defaultLayout: false,
      helpers: { customTestHelper: () => "custom" },
    });

    expect(result.engine).toBeDefined();
    expect(result.hbs).toBeDefined();
    expect(result.helpers.customTestHelper()).toBe("custom");
    expect(result.helpers.eq("a", "a")).toBe(true);
    expect(result.helpers.cacheBust()).toMatch(/^\?v=\d+\.\d+\.\d+/);
    expect(result.helpers.cachebust()).toMatch(/^\?v=\d+\.\d+\.\d+/);
    expect(result.viewsDirs.length).toBeGreaterThan(0);
    expect(app.get("view engine")).toBe("hbs");
  });
});

describe("Rate Limiter Factory (createRateLimiter)", () => {
  it("creates middleware with content negotiation handler", () => {
    const limiter = createRateLimiter({
      windowMs: 60000,
      max: 10,
      message: "Custom limit message",
    });

    expect(typeof limiter).toBe("function");
  });
});

describe("Standardized Date & Time Utilities", () => {
  it("parses dates safely and handles now/today", () => {
    expect(parseDate(null)).toBeNull();
    expect(parseDate("")).toBeNull();
    expect(parseDate("invalid")).toBeNull();
    expect(parseDate("now")).toBeInstanceOf(Date);
    expect(parseDate("today")).toBeInstanceOf(Date);
    const d = parseDate("2026-05-15T12:00:00Z");
    expect(d).toBeInstanceOf(Date);
    expect(d.getUTCFullYear()).toBe(2026);
  });

  it("produces standardized ISO strings", () => {
    expect(typeof nowIso()).toBe("string");
    expect(nowIso()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(toISOString("2026-01-01T00:00:00Z")).toContain("2026-01-01");
    expect(toISOString("")).toBe("");
  });

  it("formats dates, times and inputs consistently", () => {
    const iso = "2026-08-28T14:30:15.000Z";
    expect(formatDate(iso)).toBeDefined();
    expect(formatDate("")).toBe("N/A");
    expect(formatDate("", "—")).toBe("—");
    expect(formatDateOnly(iso)).toContain("2026");

    expect(formatDateTime(iso)).toBeDefined();
    expect(formatDateTime("")).toBe("N/A");

    expect(formatDateTimeIso("2026-08-28T14:30:15.000Z")).toMatch(/^2026-08-28/);
    expect(formatDateInput("2026-08-28T14:30:15.000Z")).toMatch(/^2026-08-28/);
    expect(formatDateTimeLocal("2026-08-28T14:30:15.000Z")).toMatch(/^2026-08-28T/);
    expect(formatDateLocale("2026-08-28T14:30:15.000Z")).toBeDefined();
    expect(formatDateLocale("2026-08-28T14:30:15.000Z", true)).toBeDefined();
  });

  it("calculates relative time, expiry, overdue, and duration", () => {
    expect(timeAgo(new Date(Date.now() - 5000))).toBe("Just now");
    expect(timeAgo(new Date(Date.now() - 3600000))).toContain("hour");
    expect(timeAgo(new Date(Date.now() - 3600000), { short: true })).toBe("1h ago");

    expect(timeRemaining(new Date(Date.now() - 1000))).toBe("Expired");
    expect(timeRemaining(new Date(Date.now() + 86400000 * 2))).toContain("remaining");

    expect(isExpired(new Date(Date.now() - 1000))).toBe(true);
    expect(isExpired(new Date(Date.now() + 100000))).toBe(false);

    expect(isOverdue(new Date(Date.now() - 1000), "Pending")).toBe(true);
    expect(isOverdue(new Date(Date.now() - 1000), "Completed")).toBe(false);

    expect(formatDuration(50)).toBe("50.00 ms");
    expect(formatDuration(2500)).toBe("2.50 s");
    expect(formatDuration("bad")).toBe("Invalid duration");
  });
});

describe("View Engine Partials Namespacing", () => {
  it("registers mbkutils partials with mbkutils_ prefix without polluting generic names", () => {
    const res = setupViewEngine(null, { rootDir: process.cwd() });
    const partials = res.handlebars.partials;

    // Must have mbkutils-prefixed partials
    expect(partials.mbkutils_header).toBeDefined();
    expect(partials.mbkutils_head).toBeDefined();
    expect(partials.mbkutils_showmessage).toBeDefined();
    expect(partials.mbkutils_backgroundElements).toBeDefined();
    expect(partials.mbkutils_versionInfo).toBeDefined();
    expect(partials.mbkutils_sharedStyles).toBeDefined();

    // Must NOT register un-namespaced generic names that collide with host apps
    expect(partials.header).toBeUndefined();
    expect(partials.head).toBeUndefined();
    expect(partials.showmessage).toBeUndefined();
  });
});
