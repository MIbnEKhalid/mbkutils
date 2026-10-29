/**
 * MBKUtils — Shared Utilities, Response Formatters, Handlebars Helpers & UI Components
 * Copyright (c) 2026 Muhammad Bin Khalid, MBKTech.org and contributors
 * Licensed under the MIT License.
 * Source: https://github.com/MIbnEKhalid/mbkutils
 */

/// <reference types="node" />

import type { Request, Response, NextFunction, Application } from "express";
import type { Debugger } from "debug";

// ===========================================================================
// Content Negotiation & User Context
// ===========================================================================

export declare function isJsonRequest(req?: Request | any): boolean;

export interface UserContext {
  userLoggedIn: boolean;
  user_id: string;
  username: string;
  full_name: string;
  role: string;
  allowed_apps: string[];
}

export declare function getUserContext(req?: Request | null): UserContext;
export declare function sanitizeErrorDetails(details: unknown): string | null;

// ===========================================================================
// Response Formatters & Envelopes
// ===========================================================================

export interface SendSuccessOptions {
  statusCode?: number;
  message?: string;
  req?: Request;
  res?: Response;
  requestId?: string;
  [key: string]: any;
}

export declare function sendSuccess(res: Response, data?: any, options?: SendSuccessOptions): Response;

export interface SendErrorOptions {
  statusCode?: number;
  details?: unknown;
  errorCode?: number | string;
  code?: number | string;
  req?: Request;
  res?: Response;
  requestId?: string;
  [key: string]: any;
}

export declare function sendError(res: Response, errorInput: any, options?: SendErrorOptions): Response;

export interface RenderErrorOptions {
  code: number | string;
  error?: string;
  message?: string;
  page?: string;
  pagename?: string;
  details?: unknown;
  app?: string;
  version?: string;
}

export declare const renderError: (res: Response, req: Request, options: RenderErrorOptions) => any;

export declare function renderPage(
  req: Request,
  res: Response,
  fileLocation: string,
  layout?: boolean | string,
  data?: Record<string, any>
): Promise<any>;

// ===========================================================================
// Error & 404 Handlers, Proxy
// ===========================================================================

export interface ErrorHandlerOptions {
  appName?: string;
  defaultPage?: string;
  defaultPageName?: string;
}

export declare function createErrorHandler(options?: ErrorHandlerOptions): (err: any, req: Request, res: Response, next: NextFunction) => any;

export interface NotFoundHandlerOptions {
  appName?: string;
  defaultPage?: string;
  defaultPageName?: string;
}

export declare function createNotFoundHandler(options?: NotFoundHandlerOptions): (req: Request, res: Response) => any;

export declare function proxycall(
  req: Request,
  res: Response,
  url: string,
  method?: string,
  headerOption?: Record<string, string>
): Promise<Response>;

// ===========================================================================
// Rate Limiter
// ===========================================================================

export interface RateLimiterOptions {
  windowMs?: number;
  max?: number | ((req: Request, res: Response) => number | Promise<number>);
  message?: string | Record<string, any>;
  statusCode?: number;
  errorView?: string;
  errorLayout?: string | boolean;
  code?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  handler?: (req: Request, res: Response, next: NextFunction) => any;
  [key: string]: any;
}

export declare function createRateLimiter(options?: RateLimiterOptions): (req: Request, res: Response, next: NextFunction) => any;

// ===========================================================================
// UI, View Engine & Handlebars Helpers
// ===========================================================================

export declare const commonHandlebarsHelpers: Record<string, any>;
export declare function resolveParentProjectVersion(explicitRootDir?: string): string;
export declare function setParentProjectVersion(version: string): void;
export declare function resolvePackageVersion(): string;
export declare function registerPackageVersion(pkgName: string, version: string): void;
export declare function getPackageVersion(pkgName?: string): string;

export interface SetupViewEngineOptions {
  rootDir?: string;
  viewsDir?: string;
  layoutsDir?: string;
  defaultLayout?: string | false;
  extname?: string;
  cache?: boolean;
  includeAuthViews?: boolean;
  additionalViewsDirs?: string[];
  additionalPartialsDirs?: string[];
  helpers?: Record<string, any>;
  runtimeOptions?: any;
}

export interface SetupViewEngineResult {
  engine: any;
  hbs: any;
  handlebars: any;
  helpers: Record<string, any>;
  viewsDirs: string[];
  partialsDirs: string[];
}

export declare function setupViewEngine(
  app?: Application | Application[],
  options?: SetupViewEngineOptions
): SetupViewEngineResult;

export declare const viewsDir: string;
export declare const publicDir: string;
export declare const mbkutilsViewsDir: string;
export declare const mbkutilsPublicDir: string;

// ===========================================================================
// Text, String & Path Utilities
// ===========================================================================

export declare function escapeHtml(value?: string | number | null): string;
export declare function escapeLikePattern(value: string | number): string;
export declare function escapeJavaScriptString(str?: string | null): string;
export declare function truncateText(text?: string | null, maxLength?: number, fallback?: string): string;
export declare function toPosixPath(filePath?: string | null): string;
export declare function getBaseName(path?: string | null): string;
export declare function getFileExt(fileName?: string | null): string;
export declare function trimSlashes(str?: string | null): string;
export declare function trimLeadingSlashes(str?: string | null): string;

// ===========================================================================
// Data & JSON Utilities
// ===========================================================================

export declare function safeParseJSON<T = any>(value: unknown, fallback?: T): T;

// ===========================================================================
// Cryptography & Tokens
// ===========================================================================

export declare function generateRandomHex(bytes?: number): string;
export declare function sha256(data: string | Buffer | Uint8Array): string;
export declare function timingSafeEqual(
  a: string | Buffer | null | undefined,
  b: string | Buffer | null | undefined
): boolean;

// ===========================================================================
// Security, Navigation & URL Utilities
// ===========================================================================

export declare function isSafeFetchUrl(urlString?: string | null): boolean;
export declare function isSafeRelativeRedirect(value?: string | null): boolean;
export declare function sanitizeRelativeRedirect(value?: string | null, fallback?: string | null): string | null;
export declare function createLogger(namespace?: string): Debugger;
export declare const logDebug: Debugger;

// ===========================================================================
// Date & Time Utilities
// ===========================================================================

export interface DateFormatOptions {
  fallback?: string;
  locale?: string;
  format?: "short" | "medium" | "long";
  short?: boolean;
}

export declare function parseDate(input: any): Date | null;
export declare function nowIso(): string;
export declare function toISOString(input: any): string;
export declare function formatDate(input: any, fallbackOrOptions?: any): string;
export declare function formatDateOnly(input: any, fallbackOrOptions?: any): string;
export declare function formatDateTime(input: any, fallbackOrOptions?: any): string;
export declare function formatDateTimeIso(input: any): string;
export declare function formatDateInput(input: any): string;
export declare function formatDateTimeLocal(input: any): string;
export declare function formatDateLocale(input: any, withTimezone?: boolean): string;
export declare function timeAgo(input: any, fallbackOrOptions?: any): string;
export declare function timeRemaining(expire: any, fallbackOrOptions?: any): string;
export declare function isExpired(dateInput: any): boolean;
export declare function isOverdue(deadline: any, status?: string): boolean;
export declare function formatDuration(ms: any): string;

// ===========================================================================
// Default Export Object
// ===========================================================================

export interface MbkUtils {
  isJsonRequest: typeof isJsonRequest;
  getUserContext: typeof getUserContext;
  sanitizeErrorDetails: typeof sanitizeErrorDetails;
  sendSuccess: typeof sendSuccess;
  sendError: typeof sendError;
  renderError: typeof renderError;
  renderPage: typeof renderPage;
  createErrorHandler: typeof createErrorHandler;
  createNotFoundHandler: typeof createNotFoundHandler;
  proxycall: typeof proxycall;
  createRateLimiter: typeof createRateLimiter;
  commonHandlebarsHelpers: Record<string, any>;
  resolveParentProjectVersion: typeof resolveParentProjectVersion;
  setParentProjectVersion: typeof setParentProjectVersion;
  resolvePackageVersion: typeof resolvePackageVersion;
  registerPackageVersion: typeof registerPackageVersion;
  getPackageVersion: typeof getPackageVersion;
  setupViewEngine: typeof setupViewEngine;
  viewsDir: string;
  publicDir: string;
  mbkutilsViewsDir: string;
  mbkutilsPublicDir: string;
  escapeHtml: typeof escapeHtml;
  escapeLikePattern: typeof escapeLikePattern;
  escapeJavaScriptString: typeof escapeJavaScriptString;
  truncateText: typeof truncateText;
  toPosixPath: typeof toPosixPath;
  getBaseName: typeof getBaseName;
  getFileExt: typeof getFileExt;
  trimSlashes: typeof trimSlashes;
  trimLeadingSlashes: typeof trimLeadingSlashes;
  safeParseJSON: typeof safeParseJSON;
  generateRandomHex: typeof generateRandomHex;
  sha256: typeof sha256;
  timingSafeEqual: typeof timingSafeEqual;
  isSafeFetchUrl: typeof isSafeFetchUrl;
  isSafeRelativeRedirect: typeof isSafeRelativeRedirect;
  sanitizeRelativeRedirect: typeof sanitizeRelativeRedirect;
  createLogger: typeof createLogger;
  logDebug: Debugger;
  parseDate: typeof parseDate;
  nowIso: typeof nowIso;
  toISOString: typeof toISOString;
  formatDate: typeof formatDate;
  formatDateOnly: typeof formatDateOnly;
  formatDateTime: typeof formatDateTime;
  formatDateTimeIso: typeof formatDateTimeIso;
  formatDateInput: typeof formatDateInput;
  formatDateTimeLocal: typeof formatDateTimeLocal;
  formatDateLocale: typeof formatDateLocale;
  timeAgo: typeof timeAgo;
  timeRemaining: typeof timeRemaining;
  isExpired: typeof isExpired;
  isOverdue: typeof isOverdue;
  formatDuration: typeof formatDuration;
  BlockKit: typeof BlockKit;
  ServiceMessenger: typeof ServiceMessenger;
  serviceMessenger: ServiceMessenger;
  buildServiceDispatchHeaders: typeof buildServiceDispatchHeaders;
}

export interface BlockKitBlock {
  type: string;
  text?: string;
  fields?: Array<{ label: string; value: string }>;
  elements?: any[];
}

export type BlockKitButtonStyle = "primary" | "danger" | "warning" | "success" | "outline" | "default" | "secondary";

export interface DispatchConditions {
  roles?: string[];
  users?: string[];
  designations?: string[];
  excludeUsers?: string[];
}

export declare const BlockKit: {
  header(text: string, priority?: string | null): BlockKitBlock;
  section(text: string, fields?: Array<{ label: string; value: string }>): BlockKitBlock;
  fields(fieldsArray: Array<{ label: string; value: string }>): BlockKitBlock;
  divider(): BlockKitBlock;
  context(elements: Array<string | { type: string; text: string }>): BlockKitBlock;
  actions(elements: Array<{ text: string; url?: string | null; action_id?: string | null; actionId?: string | null; style?: BlockKitButtonStyle; icon?: string | null }>): BlockKitBlock;
};

export interface ServiceMessengerOptions {
  baseUrl?: string;
  apiKey?: string;
  token?: string;
  secret?: string;
  serviceId?: string;
  defaultChannel?: string;
  timeout?: number;
}

export declare function buildServiceDispatchHeaders(options: {
  secret?: string | null;
  serviceId?: string | null;
  rawBody?: string;
  idempotencyKey?: string | null;
}): Record<string, string>;

export declare class ServiceMessenger {
  baseUrl: string;
  token: string | null;
  secret: string | null;
  serviceId: string;
  defaultChannel: string;
  timeout: number;
  constructor(options?: ServiceMessengerOptions);
  setToken(token: string): this;
  setSecret(secret: string): this;
  setServiceId(serviceId: string): this;
  setBaseUrl(url: string): this;
  dispatch(options: {
    channel?: string | null;
    channelKey?: string | null;
    title?: string | null;
    content?: string;
    blocks?: BlockKitBlock[] | null;
    priority?: "low" | "normal" | "high" | "urgent";
    conditions?: DispatchConditions | null;
    idempotencyKey?: string | null;
    senderName?: string | null;
    mediaUrl?: string | null;
    mediaMeta?: any;
  }): Promise<any>;
  sendCard(options: {
    channel?: string;
    channelKey?: string;
    title?: string;
    content?: string;
    blocks?: BlockKitBlock[];
    priority?: "low" | "normal" | "high" | "urgent";
    conditions?: DispatchConditions | null;
    idempotencyKey?: string | null;
    senderName?: string | null;
  }): Promise<any>;
  sendAlert(options: {
    channel?: string;
    channelKey?: string;
    title?: string;
    message: string;
    type?: "info" | "warning" | "error" | "success";
    priority?: "low" | "normal" | "high" | "urgent";
    fields?: Array<{ label: string; value: string }>;
    conditions?: DispatchConditions | null;
    idempotencyKey?: string | null;
  }): Promise<any>;
  sendDeploymentNotice(options: {
    app: string;
    version: string;
    environment?: string;
    commit?: string | null;
    status?: "succeeded" | "failed" | "in_progress";
    url?: string | null;
    conditions?: DispatchConditions | null;
    idempotencyKey?: string | null;
  }): Promise<any>;
  sendSecurityAlert(options: {
    title: string;
    details: string;
    severity?: "low" | "medium" | "high" | "critical";
    ip?: string | null;
    user?: string | null;
    conditions?: DispatchConditions | null;
    idempotencyKey?: string | null;
  }): Promise<any>;
}

export declare const serviceMessenger: ServiceMessenger;

export declare const mbkutils: MbkUtils;
export default mbkutils;
