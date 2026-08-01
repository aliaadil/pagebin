/**
 * Per-paste unlock cookie.
 *
 * When a visitor submits the right password for a protected paste, we set
 * a short-lived scoped cookie that authorises them to read the content
 * for the lifetime of the page. The cookie value is HMAC-signed with a
 * server secret so a tampered expiry or paste id fails verification and
 * the visitor is bounced back to the prompt.
 *
 * Cookie name: `pb_unlock_<id>`. Scope: a specific paste id. Lifetime: 1h.
 *
 * Production deployments MUST set PAGEBIN_COOKIE_SECRET to a long random
 * string. In dev we fall back to a derived secret so the app boots, but
 * we log a one-time warning so it never silently reaches production.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_TTL_SECONDS = 60 * 60; // 1 hour — short enough to limit replay.

let warned = false;

function secret(): Buffer {
  const raw = process.env.PAGEBIN_COOKIE_SECRET?.trim();
  if (raw && raw.length >= 16) {
    return Buffer.from(raw, 'utf8');
  }
  if (!warned) {
    // eslint-disable-next-line no-console
    console.warn(
      '[pagebin] PAGEBIN_COOKIE_SECRET is unset or too short. ' +
        'Using a derived dev secret — password unlock cookies will be ' +
        'invalidated on every restart. Set a 32+ char random value ' +
        'in production.'
    );
    warned = true;
  }
  // Derived dev secret — stable per process, lets dev work, fails on restart.
  return Buffer.from(
    `dev-only-${process.pid}-${process.platform}-pagebin-cookie`,
    'utf8'
  );
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function constantTimeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Build a signed cookie value. Format: `<expiry-secs>.<hmac>`.
 * Verify with verifyUnlockCookie() — never parse this yourself.
 */
export function mintUnlockCookie(id: string): string {
  const expires = Math.floor(Date.now() / 1000) + COOKIE_TTL_SECONDS;
  const payload = `${id}:${expires}`;
  return `${expires}.${sign(payload)}`;
}

/**
 * Verify a cookie value against a paste id.
 * Returns true only when the HMAC matches AND the id matches AND the
 * cookie has not expired.
 */
export function verifyUnlockCookie(
  id: string,
  cookieValue: string | undefined
): boolean {
  if (!cookieValue) return false;
  const dot = cookieValue.indexOf('.');
  if (dot < 1 || dot === cookieValue.length - 1) return false;
  const expiresStr = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires)) return false;
  if (expires < Math.floor(Date.now() / 1000)) return false;
  const expected = sign(`${id}:${expires}`);
  return constantTimeEq(sig, expected);
}

/** Build a Set-Cookie header value for the unlock cookie. */
export function unlockCookieName(id: string): string {
  return `pb_unlock_${id}`;
}

/** Build a Set-Cookie header that clears the unlock cookie. */
export function clearUnlockCookie(id: string): string {
  return `${unlockCookieName(id)}=; Path=/p/${id}; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** Build a Set-Cookie header that sets the unlock cookie (1h, scoped). */
export function setUnlockCookie(id: string, cookieValue: string): string {
  return [
    `${unlockCookieName(id)}=${cookieValue}`,
    `Path=/p/${id}`,
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${COOKIE_TTL_SECONDS}`,
  ].join('; ');
}