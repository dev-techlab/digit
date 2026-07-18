'use client';

import { ShieldCheck } from 'lucide-react';
import { Card } from '@/components/agent/ui';
import { useAdminPanel } from '@/components/admin/AdminShell';

export function DashboardScreen() {
  const { me } = useAdminPanel();

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600">
            <ShieldCheck size={20} />
          </span>
          <div>
            <p className="font-semibold text-slate-700">Signed in</p>
            <p className="text-sm text-slate-400">Admin ID: {me.adminId}</p>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-5">
          <p className="text-sm font-semibold text-slate-600">
            Role:{' '}
            {me.isSuperAdmin ? (
              <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text font-bold text-transparent">
                Super Admin (full access)
              </span>
            ) : (
              'Standard Admin'
            )}
          </p>
          {!me.isSuperAdmin && (
            <div className="mt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Permissions</p>
              {me.permissions.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {me.permissions.map((p) => (
                    <li
                      key={p}
                      className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600"
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
      </Card>
    </div>
  );
}
