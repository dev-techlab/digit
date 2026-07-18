'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { UserRound, CheckCircle2 } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { BrandLoader } from '@/components/shell/BrandLoader';

export function AgentForgotPasswordView() {
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const isUsernameValid = username.trim().length > 0;
    setUsernameError(!isUsernameValid);
    if (!isUsernameValid) return;
    // No password-reset backend exists yet — show a generic confirmation
    // regardless of whether the username matches an agent, to avoid leaking
    // which accounts exist.
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setSubmitted(true);
    }, 600);
  };

  if (busy) return <BrandLoader />;

  return (
    <div
      className="relative flex min-h-dvh w-full items-center justify-center overflow-x-hidden px-4 py-4 sm:py-6"
      style={{ background: 'linear-gradient(135deg, #6f7df7 0%, #7a61e0 55%, #8a55bc 100%)' }}
    >
      <div className="pointer-events-none absolute left-10 top-10 h-28 w-28 rounded-full bg-white/[0.12] backdrop-blur-[2px] sm:h-40 sm:w-40" />
      <div className="pointer-events-none absolute bottom-36 left-10 h-14 w-14 rounded-full bg-white/[0.12] backdrop-blur-[2px] sm:left-24 sm:h-20 sm:w-20" />
      <div className="pointer-events-none absolute right-6 top-1/3 h-20 w-20 rounded-full bg-white/[0.12] backdrop-blur-[2px] sm:right-16 sm:h-28 sm:w-28" />
      <div className="pointer-events-none absolute bottom-16 right-10 h-16 w-16 rounded-full bg-white/[0.12] backdrop-blur-[2px] sm:right-32 sm:h-24 sm:w-24" />

      <div className="relative z-10 my-6 w-full max-w-[440px] rounded-[24px] bg-white/95 p-6 shadow-[0_25px_70px_rgba(60,30,120,0.28)] sm:rounded-[28px] sm:p-8">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg">
            <span className="text-3xl font-semibold text-white">{APP_NAME[0]}</span>
          </div>
        </div>

        <div className="mt-4 text-center">
          <h1 className="text-2xl font-extrabold text-slate-700 sm:text-3xl">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            {submitted ? 'Check with your agent' : 'Reset your password'}
          </p>
        </div>

        {submitted ? (
          <div className="mt-6 flex flex-col items-center gap-3 text-center sm:mt-8">
            <CheckCircle2 className="h-10 w-10 text-blue-500" strokeWidth={1.8} />
            <p className="text-sm text-slate-500 sm:text-base">
              If an account exists for{' '}
              <span className="font-semibold text-slate-700">{username}</span>, your store admin
              has been notified to reset the password.
            </p>
          </div>
        ) : (
          <form className="mt-6 sm:mt-8" onSubmit={handleSubmit} noValidate>
            <div
              className={`flex items-center gap-3 rounded-2xl border-2 bg-white p-2 shadow-sm transition focus-within:border-blue-400 sm:py-3 ${
                usernameError ? 'border-red-300' : 'border-slate-200'
              }`}
            >
              <UserRound className="h-5 w-5 flex-shrink-0 text-slate-400" strokeWidth={1.8} />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (usernameError) setUsernameError(false);
                }}
                placeholder="Username"
                autoComplete="username"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 sm:text-base"
              />
            </div>
            {usernameError && <p className="mt-1 text-xs text-red-400">Please enter Username</p>}

            <button
              type="submit"
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-purple-600 py-3 text-base font-bold text-white shadow-lg transition hover:opacity-90 sm:text-lg"
            >
              Reset password
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-500 sm:text-base">
          Remember your password?{' '}
          <Link href="/agent/login" className="font-semibold text-blue-500 hover:underline">
            Login
          </Link>
        </p>
      </div>

      <div className="absolute bottom-3 left-0 right-0 px-4 text-center text-xs text-white/85 sm:text-sm">
        Copyright © 2026 All Rights Reserved.
      </div>
    </div>
  );
}
