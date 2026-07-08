'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

interface AdminMe {
  adminId: string;
  isSuperAdmin: boolean;
  permissions: string[];
}

export function AdminDashboardView() {
  const router = useRouter();
  const [me, setMe] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/me')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {
        if (!cancelled) router.replace('/admin/login');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  if (!me) return null;

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-lg font-bold text-slate-700">{APP_NAME} Admin</h1>
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-100"
        >
          <LogOut size={16} />
          Logout
        </button>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <ShieldCheck size={20} />
            </span>
            <div>
              <p className="font-semibold text-slate-700">Signed in</p>
              <p className="text-sm text-slate-400">Admin ID: {me.adminId}</p>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="text-sm font-semibold text-slate-600">
              Role: {me.isSuperAdmin ? 'Super Admin (full access)' : 'Standard Admin'}
            </p>
            {!me.isSuperAdmin && (
              <div className="mt-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Permissions
                </p>
                {me.permissions.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {me.permissions.map((p) => (
                      <li
                        key={p}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                      >
                        {p}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-slate-400">No permissions granted yet.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          This is a placeholder dashboard — build out real admin panel sections here.
        </p>
      </main>
    </div>
  );
}
