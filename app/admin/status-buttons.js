'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const NEXT_STATUS = {
  new: { value: 'in_production', label: 'Start Production' },
  in_production: { value: 'delivered', label: 'Mark Delivered' },
};

export default function StatusButtons({ id, status }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const next = NEXT_STATUS[status];

  if (!next) return null;

  async function advance() {
    setBusy(true);
    await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: next.value }),
    });
    router.refresh();
    setBusy(false);
  }

  return (
    <button className="btn btn-ghost btn-sm" onClick={advance} disabled={busy}>
      {busy ? '…' : next.label}
    </button>
  );
}
