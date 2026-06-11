import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { updateOrderStatus } from '@/lib/db';

const VALID_STATUSES = ['new', 'in_production', 'delivered'];

export async function PATCH(req) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id, status } = await req.json().catch(() => ({}));
  if (!id || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  updateOrderStatus(id, status);
  return NextResponse.json({ ok: true });
}
