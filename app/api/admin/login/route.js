import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminPassword } from '@/lib/auth';

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (password !== adminPassword()) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, password, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
