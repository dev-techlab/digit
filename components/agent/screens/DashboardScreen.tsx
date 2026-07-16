'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, Card, fmtMoney, SearchBtn, ResetBtn, EmptyState, Table } from '../ui';

interface Stats {
  totalIn: { total: number; online: number; kiosk: number };
  totalOut: { total: number; online: number; kiosk: number };
  grossNet: number;
  totalNet: number;
  platformFee: number;
  activeMembers: number;
  totalMembers: number;
  membersToday: number;
  daily: { day: string; totalIn: string; totalOut: string }[];
  topGames: { game: string; totalIn: string; totalNet: string }[];
}

const isoLocal = (d: Date) => d.toISOString().slice(0, 10);

export function DashboardScreen() {
  const defFrom = isoLocal(new Date(Date.now() - 3 * 864e5));
  const defTo = isoLocal(new Date(Date.now() + 864e5));
  const [from, setFrom] = useState(defFrom);
  const [to, setTo] = useState(defTo);
  const [stats, setStats] = useState<Stats | null>(null);

  const load = useCallback(
    (f = from, t = to) =>
      api<Stats>(`/api/agent/dashboard?from=${f}T00:00:00&to=${t}T00:00:00`).then(setStats),
    [from, to]
  );
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    setFrom(defFrom);
    setTo(defTo);
    void load(defFrom, defTo);
  };

  const kpi = (
    label: string,
    value: number,
    sub?: string,
    highlight?: boolean,
    subClass?: string
  ) => (
    <Card className={highlight ? 'border-blue-200 bg-gradient-to-br from-blue-50/70 to-white' : ''}>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-800">
        {label.includes('Members') ? value : fmtMoney(value)}
      </p>
      {sub && <p className={`mt-2 text-sm ${subClass ?? 'text-slate-400'}`}>{sub}</p>}
    </Card>
  );

  const maxIn = Math.max(1, ...(stats?.daily.map((d) => Number(d.totalIn)) ?? [1]));

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-500">Date Range</span>
        <div className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 sm:w-auto">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="min-w-0 flex-1 bg-white text-sm text-slate-600 outline-none sm:flex-none"
          />
          <span className="text-slate-300">-</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="min-w-0 flex-1 bg-white text-sm text-slate-600 outline-none sm:flex-none"
          />
        </div>
        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-400">
          US Eastern (ET)
        </span>
        <SearchBtn onClick={() => void load()} />
        <ResetBtn onClick={reset} />
      </Card>

      {stats && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpi(
              'Total In',
              stats.totalIn.total,
              `Online: ${fmtMoney(stats.totalIn.online)}   Kiosk: ${fmtMoney(stats.totalIn.kiosk)}`
            )}
            {kpi(
              'Total Out',
              stats.totalOut.total,
              `Online: ${fmtMoney(stats.totalOut.online)}   Kiosk: ${fmtMoney(stats.totalOut.kiosk)}`
            )}
            {kpi('Gross Net', stats.grossNet, 'In − Out')}
            {kpi('Total Net', stats.totalNet, `Platform Fee: ${fmtMoney(stats.platformFee)}`, true)}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpi('Active Members', stats.activeMembers, 'Played in range')}
            {kpi('Total Members', stats.totalMembers, `+${stats.membersToday} today`, false, 'text-green-500')}
          </div>

          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-800">Daily Trend</h3>
            {stats.daily.length === 0 ? (
              <EmptyState label="No data in selected range" />
            ) : (
              <div className="flex h-56 items-end gap-3 px-2">
                {stats.daily.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full items-end justify-center gap-1" style={{ height: 180 }}>
                      <div
                        className="w-1/3 rounded-t bg-blue-400"
                        title={`In ${fmtMoney(d.totalIn)}`}
                        style={{ height: `${(Number(d.totalIn) / maxIn) * 100}%` }}
                      />
                      <div
                        className="w-1/3 rounded-t bg-amber-300"
                        title={`Out ${fmtMoney(d.totalOut)}`}
                        style={{ height: `${(Number(d.totalOut) / maxIn) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">{d.day.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="mb-4 text-lg font-semibold text-slate-800">Top Games by Net</h3>
            <Table headers={['#', 'Game', 'Total In', 'Total Net']} empty={stats.topGames.length === 0}>
              {stats.topGames.map((g, i) => (
                <tr key={g.game}>
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{g.game}</td>
                  <td className="px-4 py-3">{fmtMoney(g.totalIn)}</td>
                  <td className="px-4 py-3 font-semibold text-green-600">{fmtMoney(g.totalNet)}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
