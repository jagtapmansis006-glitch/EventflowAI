import React, { useState } from 'react';
import { API_BASE, TOKEN_KEY, USER_KEY } from '../api.ts';

export const Login: React.FC<{ onLoggedIn: () => void }> = ({ onLoggedIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Login failed.');
        return;
      }
      if (data.user.role !== 'EVENT_ADMIN' && data.user.role !== 'SUPER_ADMIN') {
        setError('This account cannot access the Event Admin console.');
        return;
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      onLoggedIn();
    } catch {
      setError('Cannot reach the backend on port 3001. Is it running?');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="text-lg font-bold text-slate-900">EventFlow AI</div>
        <div className="text-xs text-slate-500 mb-5">Event Admin sign in</div>

        <input
          className="w-full mb-3 px-3 py-2 rounded-xl border border-slate-300 text-sm"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          className="w-full mb-3 px-3 py-2 rounded-xl border border-slate-300 text-sm"
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />

        {error && <div className="text-xs text-rose-600 mb-3">{error}</div>}

        <button
          onClick={submit}
          disabled={busy}
          className="w-full py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
      </div>
    </div>
  );
};