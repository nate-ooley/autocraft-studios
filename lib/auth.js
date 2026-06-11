import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'acs_admin';

export function adminPassword() {
  return process.env.ADMIN_PASSWORD || 'autocraft2026';
}

export async function isAdmin() {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === adminPassword();
}
