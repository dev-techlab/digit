'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api } from '../ui';
import { cn } from '@/lib/cn';
import { WalletData } from './wallet/types';
import { WalletOverview } from './wallet/WalletOverview';
import { WalletSettings } from './wallet/WalletSettings';
import { WalletFunding } from './wallet/WalletFunding';
import { WalletLogs } from './wallet/WalletLogs';

export function WalletScreen() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [filters, setFilters] = useState(() => {
    const d = new Date();
    const t = d.toISOString().split('T')[0];
    d.setDate(d.getDate() - 4);
    const f = d.toISOString().split('T')[0];
    return { fromDate: f, toDate: t, timezone: 'America/New_York' };
  });

  const fetcher = (url: string) => api<WalletData>(url);

  const params = new URLSearchParams();
  if (filters.fromDate) params.append('from', filters.fromDate);
  if (filters.toDate) params.append('to', filters.toDate);
  if (filters.timezone) {
    params.append(
      'tz',
      filters.timezone === 'browser'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : filters.timezone
    );
  }

  const { data, mutate } = useSWR<WalletData>(`/api/agent/wallet?${params.toString()}`, fetcher);

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 3000);
  };

  if (!data) return <p className="p-6 text-sm text-slate-400">Loading…</p>;

  return (
    <div className="space-y-5">
      {msg && (
        <div
          className={cn(
            'rounded-lg border px-4 py-2 text-sm',
            msg.ok
              ? 'border-blue-200 bg-blue-50 text-blue-600'
              : 'border-red-200 bg-red-50 text-red-500'
          )}
        >
          {msg.text}
        </div>
      )}

      <WalletOverview data={data} mutate={mutate} flash={flash} />

      <WalletSettings data={data} mutate={mutate} flash={flash} />

      <WalletFunding data={data} mutate={mutate} flash={flash} />

      <WalletLogs data={data} mutate={mutate} filters={filters} setFilters={setFilters} />
    </div>
  );
}
