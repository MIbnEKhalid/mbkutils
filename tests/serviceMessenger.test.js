import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import {
  BlockKit,
  BLOCK_KIT_STYLES,
  buildServiceDispatchHeaders,
} from "../src/index.js";

describe("BlockKit builders", () => {
  it("builds header with optional priority", () => {
    expect(BlockKit.header("Hello", "urgent")).toEqual({
      type: "header",
      text: "Hello",
      priority: "urgent",
    });
  });

  it("normalizes action button styles", () => {
    const block = BlockKit.actions([
      { text: "Go", url: "https://mbktech.org", style: "primary", actionId: "open" },
    ]);
    expect(block.elements[0]).toMatchObject({
      type: "button",
      text: "Go",
      style: "primary",
      action_id: "open",
    });
    expect(BLOCK_KIT_STYLES).toContain("warning");
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
