// FILE PATH: src/utils/serviceMessenger.js
// Authoritative Universal Service Messenger & Block Kit Client for MBK Ecosystem

import crypto from "node:crypto";

const VALID_BUTTON_STYLES = [
  "primary",
  "danger",
  "warning",
  "success",
  "outline",
  "default",
  "secondary",
];

/**
 * Block Kit Helper Functions
 */
export const BlockKit = {
  header(text, priority = null) {
    const block = { type: "header", text: String(text || "") };
    if (priority) block.priority = String(priority);
    return block;
  },
  section(text, fields = null) {
    const block = { type: "section", text: String(text || "") };
    if (Array.isArray(fields) && fields.length > 0) {
      block.fields = fields.map((f) => ({
        label: String(f?.label || ""),
        value: String(f?.value || ""),
      }));
    }
    return block;
  },
  fields(fieldsArray) {
    return {
      type: "fields",
      fields: (fieldsArray || []).map((f) => ({
        label: String(f?.label || ""),
        value: String(f?.value || ""),
      })),
    };
  },
  divider() {
    return { type: "divider" };
  },
  context(elements) {
    return {
      type: "context",
      elements: (elements || []).map((el) => {
        if (typeof el === "string") return { type: "text", text: el };
        return el;
      }),
    };
  },
  actions(buttonsArray) {
    return {
      type: "actions",
      elements: (buttonsArray || []).map((btn) => {
        const rawStyle = String(btn?.style || "default").toLowerCase();
        const style = VALID_BUTTON_STYLES.includes(rawStyle) ? rawStyle : "default";
        const actionId = btn?.action_id || btn?.actionId;
        const text = String(btn?.text || "Open").trim();
        return {
          type: "button",
          text: text || "Open",
          url: btn?.url ? String(btn.url) : null,
          action_id: actionId ? String(actionId).trim() : null,
          style,
          icon: btn?.icon ? String(btn.icon) : null,
        };
      }),
    };
  },
};

export const BLOCK_KIT_STYLES = [...VALID_BUTTON_STYLES];

function env(name) {
  return typeof process !== "undefined" ? process.env?.[name] : undefined;
}

/**
 * Build dispatch headers (Bearer token or HMAC-SHA256 over `<timestamp>.<rawBody>`).
 */
export function buildServiceDispatchHeaders({
  secret,
  serviceId,
  rawBody,
  idempotencyKey = null,
} = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = secret ? String(secret) : "";

  if (idempotencyKey) {
    headers["X-Idempotency-Key"] = String(idempotencyKey);
  }

  if (!token) return headers;

  if (token.startsWith("mbk_svc_") || token.startsWith("mbk_pat_")) {
    headers.Authorization = `Bearer ${token}`;
    if (serviceId) headers["X-MBK-Service-ID"] = String(serviceId);
    return headers;
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = crypto
    .createHmac("sha256", token)
    .update(`${timestamp}.${rawBody || ""}`)
    .digest("hex");

  headers["X-MBK-Service-ID"] = String(serviceId || env("MBK_SERVICE_ID") || "mbkutils");
  headers["X-MBK-Timestamp"] = timestamp;
  headers["X-MBK-Signature"] = signature;
  return headers;
}

/**
 * ServiceMessenger Class — official M2M Block Kit client SDK
 */
export class ServiceMessenger {
  constructor(options = {}) {
    this.baseUrl = (
      options.baseUrl ||
      env("MBKCORE_URL") ||
      env("MBK_CORE_URL") ||
      "http://localhost:5001"
    ).replace(/\/+$/, "");

    this.secret =
      options.secret ||
      options.apiKey ||
      options.token ||
      env("MBK_SERVICE_SECRET") ||
      env("MBK_SERVICE_TOKEN") ||
      env("MBK_API_KEY") ||
      null;

    this.serviceId = options.serviceId || env("MBK_SERVICE_ID") || "mbkutils";
    this.token = this.secret;
    this.defaultChannel = options.defaultChannel || "system_status";
    this.timeout = options.timeout || 10000;
  }

  setToken(token) {
    this.secret = token;
    this.token = token;
    return this;
  }

  setSecret(secret) {
    return this.setToken(secret);
  }

  setServiceId(serviceId) {
    this.serviceId = serviceId;
    return this;
  }

  setBaseUrl(url) {
    this.baseUrl = (url || "http://localhost:5001").replace(/\/+$/, "");
    return this;
  }

  /**
   * Fluent condition targeting — chain before dispatch().
   * Each method merges into a pending conditions object that is
   * automatically applied on the next dispatch() call and then reset.
   */
  toRoles(rolesArray) {
    this._pendingConditions = { ...(this._pendingConditions || {}), roles: rolesArray };
    return this;
  }

  toUsers(usersArray) {
    this._pendingConditions = { ...(this._pendingConditions || {}), users: usersArray };
    return this;
  }

  toDesignations(designationsArray) {
    this._pendingConditions = {
      ...(this._pendingConditions || {}),
      designations: designationsArray,
    };
    return this;
  }

  excludingUsers(excludeArray) {
    this._pendingConditions = {
      ...(this._pendingConditions || {}),
      excludeUsers: excludeArray,
    };
    return this;
  }

  async dispatch({
    channel = null,
    channelKey = null,
    title = null,
    content = "",
    blocks = null,
    priority = "normal",
    conditions = null,
    idempotencyKey = null,
    senderName = null,
    mediaUrl = null,
    mediaMeta = null,
  } = {}) {
    const targetChannel = (channelKey || channel || this.defaultChannel).toLowerCase();
    const endpoint = `${this.baseUrl}/api/chat/channels/${targetChannel}/dispatch`;

    // Merge fluent-chained conditions with any inline conditions passed to dispatch
    const mergedConditions =
      this._pendingConditions || conditions
        ? { ...(this._pendingConditions || {}), ...(conditions || {}) }
        : undefined;
    this._pendingConditions = null;

    const payload = {
      title,
      content,
      blocks,
      priority,
      conditions: mergedConditions || undefined,
      idempotencyKey,
      senderName,
      mediaUrl,
      mediaMeta,
    };
    const rawBody = JSON.stringify(payload);

    const headers = buildServiceDispatchHeaders({
      secret: this.secret,
      serviceId: this.serviceId,
      rawBody,
      idempotencyKey,
    });

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), this.timeout) : null;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: rawBody,
        signal: controller ? controller.signal : undefined,
      });

      if (timer) clearTimeout(timer);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`[ServiceMessenger] Dispatch failed (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (err) {
      if (timer) clearTimeout(timer);
      throw err;
    }
  }

  async sendCard({
    channel,
    channelKey,
    title,
    content,
    blocks = [],
    priority = "normal",
    conditions = null,
    idempotencyKey = null,
    senderName = null,
  } = {}) {
    return this.dispatch({
      channel,
      channelKey,
      title,
      content,
      blocks,
      priority,
      conditions,
      idempotencyKey,
      senderName,
    });
  }

  async sendAlert({
    channel = "system_status",
    channelKey = null,
    title,
    message,
    type = "info",
    priority = "normal",
    fields = [],
    conditions = null,
    idempotencyKey = null,
  } = {}) {
    const icon = type === "error" ? "🚨" : type === "warning" ? "⚠️" : type === "success" ? "✅" : "ℹ️";
    const blocks = [
      BlockKit.header(`${icon} ${title || "System Notice"}`, priority),
      BlockKit.section(message),
    ];

    if (Array.isArray(fields) && fields.length > 0) {
      blocks.push(BlockKit.fields(fields));
    }

    return this.dispatch({
      channel,
      channelKey,
      title,
      content: message,
      blocks,
      priority: type === "error" ? "urgent" : type === "warning" ? "high" : priority,
      conditions,
      idempotencyKey,
    });
  }

  async sendDeploymentNotice({
    app,
    version,
    environment = "production",
    commit = null,
    status = "succeeded",
    url = null,
    conditions = null,
    idempotencyKey = null,
  } = {}) {
    const icon = status === "succeeded" ? "🚀" : status === "failed" ? "❌" : "⏳";
    const headerTitle = `${icon} Deployment ${status.toUpperCase()}: ${app} v${version}`;

    const fields = [
      { label: "Application", value: app },
      { label: "Version", value: `v${version}` },
      { label: "Environment", value: environment.toUpperCase() },
      { label: "Status", value: status.toUpperCase() },
    ];
    if (commit) {
      fields.push({ label: "Commit", value: String(commit).substring(0, 7) });
    }

    const blocks = [BlockKit.header(headerTitle), BlockKit.fields(fields)];

    if (url) {
      blocks.push(
        BlockKit.actions([
          { text: "View Deployment", url, style: status === "succeeded" ? "primary" : "default" },
        ]),
      );
    }

    return this.dispatch({
      channel: "build_deploys",
      title: headerTitle,
      content: `Deployment of ${app} v${version} to ${environment} ${status}.`,
      blocks,
      priority: status === "failed" ? "high" : "normal",
      conditions,
      idempotencyKey,
    });
  }

  async sendSecurityAlert({
    title,
    details,
    severity = "high",
    ip = null,
    user = null,
    conditions = null,
    idempotencyKey = null,
  } = {}) {
    const icon = severity === "critical" || severity === "high" ? "🛑" : "⚠️";
    const headerTitle = `${icon} Security Alert: ${title}`;

    const fields = [{ label: "Severity", value: severity.toUpperCase() }];
    if (user) fields.push({ label: "User", value: String(user) });
    if (ip) fields.push({ label: "Origin IP", value: String(ip) });

    const blocks = [
      BlockKit.header(headerTitle, severity === "critical" ? "urgent" : "high"),
      BlockKit.section(details),
      BlockKit.fields(fields),
    ];

    return this.dispatch({
      channel: "security_alerts",
      title: headerTitle,
      content: details,
      blocks,
      priority: severity === "critical" ? "urgent" : "high",
      conditions,
      idempotencyKey,
    });
  }
}

export const serviceMessenger = new ServiceMessenger();
export default serviceMessenger;
