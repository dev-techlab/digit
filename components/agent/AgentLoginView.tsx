'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, UserRound } from 'lucide-react';
import { api } from './ui';

export function AgentLoginView() {
  const router = useRouter();

  // Lift the player app's 560/720px body cap + dark background for this page.
  useEffect(() => {
    const { body, documentElement: html } = document;
    const prev = {
      maxWidth: body.style.maxWidth,
      margin: body.style.margin,
      bodyBg: body.style.background,
      htmlBg: html.style.background,
    };
    body.style.maxWidth = 'none';
    body.style.margin = '0';
    body.style.background = '#f8fafc';
    html.style.background = '#f8fafc';
    return () => {
      body.style.maxWidth = prev.maxWidth;
      body.style.margin = prev.margin;
      body.style.background = prev.bodyBg;
      html.style.background = prev.htmlBg;
    };
  }, []);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api('/api/agent/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      router.replace('/admin');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4"
      style={{ colorScheme: 'light' }}
    >
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-green-600 text-xl font-bold text-white">
            D
          </span>
          <h1 className="text-xl font-bold text-slate-800">Digit Link</h1>
          <p className="text-sm text-slate-400">Agent Panel Sign In</p>
        </div>
        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}
        <label className="mb-4 flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 focus-within:border-blue-400">
          <UserRound size={17} className="text-slate-300" />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            className="w-full text-sm text-slate-700 outline-none placeholder:text-slate-300"
          />
        </label>
        <label className="mb-6 flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 focus-within:border-blue-400">
          <Lock size={17} className="text-slate-300" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="w-full text-sm text-slate-700 outline-none placeholder:text-slate-300"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !username || !password}
          className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
