import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  adminConfigured,
  passwordMatches,
  makeSessionToken,
  sessionCookieOptions,
} from '@/lib/auth';

// Best-effort in-memory throttle. Per serverless instance (not global), but it
// still blunts online brute-forcing; the real protection is a strong env-only
// ADMIN_PASSWORD plus the constant-time compare in passwordMatches.
const attempts = new Map(); // ip -> { count, resetAt }
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function rateLimited(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 0, resetAt: now + WINDOW_MS });
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}

function recordFailure(ip) {
  const rec = attempts.get(ip);
  if (rec) rec.count += 1;
}

export async function POST(req) {
  if (!adminConfigured()) {
    return NextResponse.json({ error: 'Admin not configured.' }, { status: 503 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a few minutes.' },
      { status: 429 }
    );
  }

  const { password } = await req.json().catch(() => ({}));
  if (!passwordMatches(password)) {
    recordFailure(ip);
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  // Mark the cookie Secure only when actually served over HTTPS (Vercel), so
  // local http testing still works while production stays HTTPS-only.
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '');
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, makeSessionToken(), sessionCookieOptions(proto === 'https'));
  return res;
}
