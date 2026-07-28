import crypto from "node:crypto";

// Single-user admin auth. The session cookie is an HMAC of a constant, keyed by
// ADMIN_PASSWORD — so it can't be forged without knowing the password, and it
// invalidates automatically if the password is ever changed. Node runtime only.
export const ADMIN_COOKIE = "ttb_admin";

function key(): string {
  return process.env.ADMIN_PASSWORD ?? "";
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function adminConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

export function verifyPassword(pw: string): boolean {
  const expected = key();
  return !!expected && safeEqual(pw, expected);
}

export function sessionToken(): string {
  return crypto.createHmac("sha256", key()).update("ttb-admin-v1").digest("hex");
}

export function isAuthed(cookieValue: string | undefined): boolean {
  if (!cookieValue || !adminConfigured()) return false;
  return safeEqual(cookieValue, sessionToken());
}
