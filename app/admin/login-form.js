'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      setError('Incorrect password.');
    }
  }

  return (
    <form onSubmit={submit}>
      {error && <div className="error-msg">{error}</div>}
      <div className="field">
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
      </div>
      <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>
        Log In
      </button>
    </form>
  );
}
