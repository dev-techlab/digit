'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { BrandLoader } from '@/components/shell/BrandLoader';

export function AdminLoginView() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const isEmailValid = email.trim().length > 0;
    const isPasswordValid = password.trim().length > 0;
    setEmailError(!isEmailValid);
    setPasswordError(!isPasswordValid);
    if (!isEmailValid || !isPasswordValid) return;

    setLoading(true);
    setFormError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error ?? 'Invalid credentials');
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setFormError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <BrandLoader />;

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
          <p className="mt-1 text-sm text-slate-500 sm:text-base">Welcome Back, Please Login</p>
        </div>

        <form className="mt-4 sm:mt-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-3">
            <div>
              <div
                className={`flex items-center gap-3 rounded-2xl border-2 bg-white p-2 shadow-sm transition focus-within:border-blue-400 sm:py-3 ${
                  emailError ? 'border-red-300' : 'border-slate-200'
                }`}
              >
                <Mail className="h-5 w-5 flex-shrink-0 text-slate-400" strokeWidth={1.8} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(false);
                  }}
                  placeholder="Email"
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 sm:text-base"
                />
              </div>
              {emailError && <p className="mt-1 text-xs text-red-400">Please enter your email</p>}
            </div>

            <div>
              <div
                className={`flex items-center gap-3 rounded-2xl border-2 bg-white p-2 shadow-sm transition focus-within:border-blue-400 sm:py-3 ${
                  passwordError ? 'border-red-300' : 'border-slate-200'
                }`}
              >
                <Lock className="h-5 w-5 flex-shrink-0 text-slate-400" strokeWidth={1.8} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(false);
                  }}
                  placeholder="Password"
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 sm:text-base"
                />
              </div>
              {passwordError && <p className="mt-1 text-xs text-red-400">Please enter Password</p>}
            </div>
          </div>

          {formError && (
            <p className="mt-3 text-center text-sm font-semibold text-red-500">{formError}</p>
          )}

          <div className="mt-2 flex justify-end">
            <Link
              href="/admin/forgot-password"
              className="text-xs font-semibold text-blue-500 hover:underline sm:text-sm"
            >
              Reset password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-3 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 py-2 text-base font-bold text-white shadow-lg transition hover:from-indigo-600 hover:to-purple-700 disabled:opacity-60 sm:py-3 sm:text-lg"
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
      </div>

      <div className="absolute bottom-3 left-0 right-0 px-4 text-center text-xs text-white/85 sm:text-sm">
        Copyright © 2026 All Rights Reserved.
      </div>
    </div>
  );
}
