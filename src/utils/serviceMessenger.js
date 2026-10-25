// FILE PATH: src/utils/serviceMessenger.js
// Authoritative Universal Service Messenger & Block Kit Client for MBK Ecosystem

/**
 * Block Kit Helper Functions
 */
export const BlockKit = {
  header(text) {
    return { type: "header", text: String(text || "") };
  },
  section(text, fields = null) {
    const block = { type: "section", text: String(text || "") };
    if (Array.isArray(fields) && fields.length > 0) {
      block.fields = fields;
    }
    return block;
  },
  fields(fieldsArray) {
    return {
      type: "fields",
      fields: (fieldsArray || []).map((f) => ({
        label: String(f.label || ""),
        value: String(f.value || ""),
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
  actions(elements) {
    const validStyles = ["primary", "danger", "warning", "success", "outline", "default", "secondary"];
    return {
      type: "actions",
      elements: (elements || []).map((btn) => {
        const rawStyle = String(btn.style || "default").toLowerCase();
        const style = validStyles.includes(rawStyle) ? rawStyle : "default";
        return {
          type: "button",
          text: String(btn.text || "Open"),
          url: btn.url || null,
          action_id: btn.action_id || btn.actionId || null,
          style,
          icon: btn.icon ? String(btn.icon) : null,
        };
      }),
    };
  },
};

export const BLOCK_KIT_STYLES = [
  "primary",
  "danger",
  "warning",
  "success",
  "outline",
  "default",
  "secondary",
];

/**
 * ServiceMessenger Class
 */
export class ServiceMessenger {
  constructor(options = {}) {
    this.baseUrl = (
      options.baseUrl ||
      (typeof process !== "undefined" && process.env?.MBKCORE_URL) ||
      "http://localhost:5001"
    ).replace(/\/+$/, "");

    this.token =
      options.apiKey ||
      options.token ||
      (typeof process !== "undefined" && (process.env?.MBK_SERVICE_TOKEN || process.env?.MBK_API_KEY)) ||
      null;

    this.defaultChannel = options.defaultChannel || "system_status";
    this.timeout = options.timeout || 10000;
  }

  setToken(token) {
    this.token = token;
    return this;
  }

  setBaseUrl(url) {
    this.baseUrl = (url || "http://localhost:5001").replace(/\/+$/, "");
    return this;
  }

  /**
   * Dispatches a raw service card or Block Kit message to a channel
   */
  async dispatch({
    channel = null,
    channelKey = null,
    title = null,
    content = "",
    blocks = null,
    priority = "normal",
    idempotencyKey = null,
    senderName = null,
    mediaUrl = null,
    mediaMeta = null,
  }) {
    const targetChannel = (channelKey || channel || this.defaultChannel).toLowerCase();
    const endpoint = `${this.baseUrl}/api/chat/channels/${targetChannel}/dispatch`;

    const headers = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    if (idempotencyKey) {
      headers["X-Idempotency-Key"] = String(idempotencyKey);
    }

    const payload = {
      title,
      content,
      blocks,
      priority,
      idempotencyKey,
      senderName,
      mediaUrl,
      mediaMeta,
    };

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), this.timeout) : null;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
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

  /**
   * Send a Block Kit Card
   */
  async sendCard({
    channel,
    title,
    content,
    blocks = [],
    priority = "normal",
    idempotencyKey = null,
    senderName = null,
  }) {
    return this.dispatch({
      channel,
      title,
      content,
      blocks,
      priority,
      idempotencyKey,
      senderName,
    });
  }

  /**
   * Send a simple formatted Alert
   */
  async sendAlert({
    channel = "system_status",
    title,
    message,
    type = "info", // 'info' | 'warning' | 'error' | 'success'
    priority = "normal",
    idempotencyKey = null,
    fields = [],
  }) {
    const icon = type === "error" ? "🚨" : type === "warning" ? "⚠️" : type === "success" ? "✅" : "ℹ️";
    const blocks = [
      BlockKit.header(`${icon} ${title || "System Notice"}`),
      BlockKit.section(message),
    ];

    if (Array.isArray(fields) && fields.length > 0) {
      blocks.push(BlockKit.fields(fields));
    }

    return this.dispatch({
      channel,
      title,
      content: message,
      blocks,
      priority: type === "error" ? "urgent" : type === "warning" ? "high" : priority,
      idempotencyKey,
    });
  }

  /**
   * Send a structured Deployment Notice
   */
  async sendDeploymentNotice({
    app,
    version,
    environment = "production",
    commit = null,
    status = "succeeded", // 'succeeded' | 'failed' | 'in_progress'
    url = null,
    idempotencyKey = null,
  }) {
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

    const blocks = [
      BlockKit.header(headerTitle),
      BlockKit.fields(fields),
    ];

    if (url) {
      blocks.push(
        BlockKit.actions([
          { text: "View Deployment", url, style: status === "succeeded" ? "primary" : "default" },
        ])
      );
    }

    return this.dispatch({
      channel: "build_deploys",
      title: headerTitle,
      content: `Deployment of ${app} v${version} to ${environment} ${status}.`,
      blocks,
      priority: status === "failed" ? "high" : "normal",
      idempotencyKey,
    });
  }

  /**
   * Send a Security Alert
   */
  async sendSecurityAlert({
    title,
    details,
    severity = "high", // 'low' | 'medium' | 'high' | 'critical'
    ip = null,
    user = null,
    idempotencyKey = null,
  }) {
    const icon = severity === "critical" || severity === "high" ? "🛑" : "⚠️";
    const headerTitle = `${icon} Security Alert: ${title}`;

    const fields = [
      { label: "Severity", value: severity.toUpperCase() },
    ];
    if (user) fields.push({ label: "User", value: String(user) });
    if (ip) fields.push({ label: "Origin IP", value: String(ip) });

    const blocks = [
      BlockKit.header(headerTitle),
      BlockKit.section(details),
      BlockKit.fields(fields),
    ];

    return this.dispatch({
      channel: "security_alerts",
      title: headerTitle,
      content: details,
      blocks,
      priority: severity === "critical" ? "urgent" : "high",
      idempotencyKey,
    });
  }
}

export const serviceMessenger = new ServiceMessenger();
export default serviceMessenger;
