import { describe, it, expect, vi, afterEach } from "vitest";
import crypto from "node:crypto";
import {
  BlockKit,
  BLOCK_KIT_STYLES,
  BLOCK_KIT_TONES,
  BLOCK_KIT_CARD_TONES,
  ServiceMessenger,
  buildServiceDispatchHeaders,
} from "../src/index.js";

describe("BlockKit builders", () => {
  it("builds header with optional priority and badge(s)", () => {
    expect(BlockKit.header("Hello", "urgent")).toEqual({
      type: "header",
      text: "Hello",
      priority: "urgent",
    });

    expect(
      BlockKit.header("Task #42", "high", { text: "Pending", tone: "warning" }),
    ).toEqual({
      type: "header",
      text: "Task #42",
      priority: "high",
      badge: { text: "Pending", tone: "warning" },
    });

    expect(
      BlockKit.header("Deploy", "normal", [
        { text: "Prod", tone: "info" },
        { text: "InvalidTone", tone: "bogus" },
      ]),
    ).toEqual({
      type: "header",
      text: "Deploy",
      priority: "normal",
      badges: [
        { text: "Prod", tone: "info" },
        { text: "InvalidTone", tone: "neutral" },
      ],
    });
  });

  it("builds badges block with tone normalization", () => {
    expect(
      BlockKit.badges([
        { text: "High", tone: "danger" },
        "DefaultTag",
        { text: "Unknown", tone: "nope" },
      ]),
    ).toEqual({
      type: "badges",
      items: [
        { text: "High", tone: "danger" },
        { text: "DefaultTag", tone: "neutral" },
        { text: "Unknown", tone: "neutral" },
      ],
    });
    expect(BLOCK_KIT_TONES).toContain("success");
    expect(BLOCK_KIT_CARD_TONES).toContain("critical");
  });

  it("normalizes action button styles, value, confirm, prompt, and require_ack", () => {
    const block = BlockKit.actions([
      {
        text: "Accept",
        style: "primary",
        actionId: "task_accept",
        value: "42",
        requireAck: true,
      },
      {
        text: "Decline",
        style: "danger",
        action_id: "task_decline",
        value: 42,
        confirm: {
          title: "Decline Task?",
          message: "Notify the creator?",
          confirmLabel: "Decline",
          cancelLabel: "Back",
        },
        prompt: {
          title: "Reason",
          placeholder: "Optional note...",
          required: true,
          submitLabel: "Submit",
        },
      },
      {
        type: "select",
        actionId: "task_priority",
        placeholder: "Priority",
        initialValue: "Medium",
        options: [
          { label: "Low", value: "Low", tone: "neutral" },
          { label: "Urgent", value: "Urgent", tone: "danger" },
        ],
      },
    ]);

    expect(block.elements[0]).toMatchObject({
      type: "button",
      text: "Accept",
      style: "primary",
      action_id: "task_accept",
      value: "42",
      require_ack: true,
    });
    expect(block.elements[1]).toMatchObject({
      type: "button",
      text: "Decline",
      style: "danger",
      action_id: "task_decline",
      value: 42,
      confirm: {
        title: "Decline Task?",
        message: "Notify the creator?",
        confirmLabel: "Decline",
        cancelLabel: "Back",
      },
      prompt: {
        title: "Reason",
        placeholder: "Optional note...",
        required: true,
        submitLabel: "Submit",
      },
    });
    expect(block.elements[2]).toEqual({
      type: "select",
      action_id: "task_priority",
      placeholder: "Priority",
      initial_value: "Medium",
      options: [
        { label: "Low", value: "Low", tone: "neutral" },
        { label: "Urgent", value: "Urgent", tone: "danger" },
      ],
    });
    expect(BLOCK_KIT_STYLES).toContain("warning");
  });

  it("builds standalone select block", () => {
    expect(
      BlockKit.select({
        actionId: "task_status",
        placeholder: "Change status",
        initial_value: "Pending",
        options: [{ label: "In Progress", value: "In Progress", tone: "info" }],
      }),
    ).toEqual({
      type: "select",
      action_id: "task_status",
      placeholder: "Change status",
      initial_value: "Pending",
      options: [{ label: "In Progress", value: "In Progress", tone: "info" }],
    });
  });
});

describe("ServiceMessenger dispatch payloads", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults defaultChannel to 'system' and forwards per-message targeting", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, id: "msg_1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const messenger = new ServiceMessenger({
      baseUrl: "https://core.mbktech.org",
      secret: "mbk_svc_test",
      serviceId: "work-svc",
    });
    expect(messenger.defaultChannel).toBe("system");

    await messenger
      .visibleTo(["mbk_u1", "mbk_u2"])
      .notify(["mbk_u2"])
      .dispatch({
        channelKey: "tasks",
        title: "Task #7",
        content: "Review PR",
        tone: "important",
        requireAck: true,
        expiresAt: "2026-12-01T00:00:00.000Z",
        idempotencyKey: "task-7-assign",
      });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://core.mbktech.org/api/chat/channels/tasks/dispatch");
    expect(init.headers["X-Idempotency-Key"]).toBe("task-7-assign");

    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      title: "Task #7",
      content: "Review PR",
      tone: "important",
      visibleToUsers: ["mbk_u1", "mbk_u2"],
      notifyUsers: ["mbk_u2"],
      requireAck: true,
      expiresAt: "2026-12-01T00:00:00.000Z",
      idempotencyKey: "task-7-assign",
    });

    // Pending fluent state is cleared after dispatch
    await messenger.dispatch({ content: "Follow-up" });
    const [url2, init2] = fetchMock.mock.calls[1];
    expect(url2).toBe("https://core.mbktech.org/api/chat/channels/system/dispatch");
    const body2 = JSON.parse(init2.body);
    expect(body2.visibleToUsers).toBeUndefined();
    expect(body2.notifyUsers).toBeUndefined();
  });
});

describe("buildServiceDispatchHeaders", () => {
  it("uses Bearer for mbk_svc_ tokens", () => {
    const headers = buildServiceDispatchHeaders({
      secret: "mbk_svc_abc",
      serviceId: "srv_test",
      rawBody: "{}",
      idempotencyKey: "k1",
    });
    expect(headers.Authorization).toBe("Bearer mbk_svc_abc");
    expect(headers["X-Idempotency-Key"]).toBe("k1");
    expect(headers["X-MBK-Signature"]).toBeUndefined();
  });

  it("signs HMAC over timestamp.rawBody", () => {
    const rawBody = JSON.stringify({ title: "hi" });
    const secret = "shared-hmac-secret";
    const headers = buildServiceDispatchHeaders({
      secret,
      serviceId: "srv_hmac",
      rawBody,
    });
    expect(headers["X-MBK-Service-ID"]).toBe("srv_hmac");
    expect(headers["X-MBK-Timestamp"]).toMatch(/^\d+$/);
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${headers["X-MBK-Timestamp"]}.${rawBody}`)
      .digest("hex");
    expect(headers["X-MBK-Signature"]).toBe(expected);
  });
});
