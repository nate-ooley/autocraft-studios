import { cookies } from 'next/headers';
import crypto from 'crypto';

export const ADMIN_COOKIE = 'acs_admin';
const SESSION_DAYS = 30;

// The admin password must be configured via env — no hardcoded fallback, so a
// misconfigured deploy fails CLOSED (no access) instead of open.
function adminSecret() {
  return process.env.ADMIN_PASSWORD || '';
}

export function adminConfigured() {
  return adminSecret().length > 0;
}

function timingSafeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function passwordMatches(submitted) {
  const secret = adminSecret();
  if (!secret) return false;
  return timingSafeEqual(submitted || '', secret);
}

// Cookie holds an HMAC-signed, expiring token — NOT the password itself. A
// leaked cookie can't be reversed into the password, and it expires on its own.
export function makeSessionToken() {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `admin.${exp}`;
  const sig = crypto.createHmac('sha256', adminSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token) {
  if (!token || !adminConfigured()) return false;
  const idx = token.lastIndexOf('.');
  if (idx < 0) return false;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = crypto.createHmac('sha256', adminSecret()).update(payload).digest('base64url');
  if (!timingSafeEqual(sig, expected)) return false;
  const exp = Number(payload.split('.')[1]);
  return Boolean(exp) && Date.now() < exp;
}

export function sessionCookieOptions(secure = true) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export async function isAdmin() {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}
