'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { BrandLoader } from '@/components/shell/BrandLoader';

import { z } from 'zod';
import { Button } from '@/components/ui/Button';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export function AdminLoginView() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGlobalError('');

    const parseResult = loginSchema.safeParse(form);
    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      parseResult.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0].toString()] = issue.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGlobalError(data.error ?? 'Invalid credentials');
        setLoading(false);
        return;
      }
      // Deliberately don't reset `loading` on the success path
      router.replace('/admin');
    } catch {
      setGlobalError('Something went wrong. Please try again.');
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
          <Image
            src="/logo.png"
            alt="Logo"
            width={128}
            height={128}
            className="h-14 w-14 rounded-2xl object-contain shadow-lg"
          />
        </div>

        <div className="mt-4 text-center">
          <h1 className="text-2xl font-extrabold text-slate-700 sm:text-3xl">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">Welcome Back, Please Login</p>
        </div>

        <form className="mt-4 sm:mt-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email Address</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                  }}
                  className={`block w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 ${
                    fieldErrors.email
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-200'
                  }`}
                  placeholder="admin@example.com"
                />
              </div>
              {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value });
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                  }}
                  className={`block w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 ${
                    fieldErrors.password
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-200'
                  }`}
                  placeholder="••••••••"
                />
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-500">{fieldErrors.password}</p>
              )}
            </div>
          </div>

          {globalError && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{globalError}</div>
          )}

          <div className="mt-2 flex justify-end">
            <Link
              href="/admin/forgot-password"
              className="text-xs font-semibold text-blue-500 hover:underline sm:text-sm"
            >
              Reset password?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>

      <div className="absolute bottom-3 left-0 right-0 px-4 text-center text-xs text-white/85 sm:text-sm">
        Copyright © {new Date().getFullYear()} All Rights Reserved.
      </div>
    </div>
  );
}
