/**
 * MBKUtils — Cryptography & Token Utilities
 */

import crypto from "node:crypto";

/**
 * Generates a cryptographically secure random hexadecimal string.
 * @param {number} [bytes=32] Number of random bytes to generate (default: 32 -> 64 hex chars)
 * @returns {string}
 */
export function generateRandomHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Computes hexadecimal SHA-256 hash of a string or buffer.
 * @param {string | Buffer | Uint8Array} data
 * @returns {string}
 */
export function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Constant-time comparison of two strings or buffers to protect against timing attacks.
 * Returns false safely if inputs are null/undefined or if byte lengths differ.
 * @param {string | Buffer | null} a
 * @param {string | Buffer | null} b
 * @returns {boolean}
 */
export function timingSafeEqual(a, b) {
  if (a == null || b == null) return false;
  const bufA = typeof a === "string" ? Buffer.from(a) : Buffer.isBuffer(a) ? a : Buffer.from(a);
  const bufB = typeof b === "string" ? Buffer.from(b) : Buffer.isBuffer(b) ? b : Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
