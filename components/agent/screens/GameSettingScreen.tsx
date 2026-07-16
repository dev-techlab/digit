'use client';

import { useEffect, useState } from 'react';
import { Copy, Eye, RefreshCw } from 'lucide-react';
import { api, Btn, Field, fmtDateTime, Modal, TextInput, Toggle } from '../ui';
import { cn } from '@/lib/cn';

const AVATAR_GRADIENTS = [
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-green-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-red-500',
  'from-violet-400 to-purple-600',
  'from-cyan-400 to-sky-600',
];

/** Platform icon with graceful fallback: real CDN icon → branded letter avatar. */
function PlatformIcon({ name, iconUrl }: { name: string; iconUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  if (iconUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    );
  }
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white',
        AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length]
      )}
    >
      {initials}
    </span>
  );
}

interface PlatformRow {
  id: string;
  name: string;
  iconUrl: string | null;
  enabled: boolean;
  kioskId: string | null;
  posAccount: string | null;
  moneyBox: string | null;
  remark: string | null;
  scoreCostPct: string;
  minDeposit: string;
  minRedemption: string;
  redeemDailyLimit: string;
  minDepositToUnlock: string;
  score: string | null;
  scoreSyncedAt: string | null;
}

export function GameSettingScreen() {
  const [platforms, setPlatforms] = useState<PlatformRow[]>([]);
  const [detail, setDetail] = useState<PlatformRow | null>(null);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = () =>
    api<{ platforms: PlatformRow[] }>('/api/agent/game-settings').then((d) =>
      setPlatforms(d.platforms)
    );
  useEffect(() => {
    void load();
  }, []);

  const toggle = async (p: PlatformRow, enabled: boolean) => {
    setPlatforms((rows) => rows.map((r) => (r.id === p.id ? { ...r, enabled } : r)));
    await api('/api/agent/game-settings', {
      method: 'PUT',
      body: JSON.stringify({ platformId: p.id, enabled }),
    });
  };

  const refresh = async (p: PlatformRow) => {
    await api('/api/agent/game-settings', {
      method: 'POST',
      body: JSON.stringify({ platformId: p.id }),
    });
    void load();
  };

  const openDetail = (p: PlatformRow) => {
    setDetail(p);
    setEdit({
      kioskId: p.kioskId ?? '',
      posAccount: p.posAccount ?? '',
      posPassword: '',
      moneyBox: p.moneyBox ?? '1',
      remark: p.remark ?? '',
      scoreCostPct: p.scoreCostPct,
      minDeposit: p.minDeposit,
      minRedemption: p.minRedemption,
      redeemDailyLimit: p.redeemDailyLimit,
      minDepositToUnlock: p.minDepositToUnlock,
    });
  };

  const saveDetail = async () => {
    if (!detail) return;
    const body: Record<string, string> = { platformId: detail.id, ...edit };
    if (!body.posPassword) delete body.posPassword;
    await api('/api/agent/game-settings', { method: 'PUT', body: JSON.stringify(body) });
    setDetail(null);
    void load();
  };

  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm text-slate-500">
        Game settings are managed by your agent. Contact your agent for changes.
      </p>
      <p className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm text-white">
        The following games can automatically add or subtract points. Simply configure your game
        store account.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {platforms.map((p) => (
          <div
            key={p.id}
            className={cn(
              'rounded-xl border bg-white p-4 shadow-sm transition',
              p.enabled ? 'border-l-4 border-slate-100 border-l-green-500' : 'border-slate-100'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PlatformIcon name={p.name} iconUrl={p.iconUrl} />
                <span className="font-semibold text-slate-800">{p.name}</span>
              </div>
              <Toggle checked={p.enabled} onChange={(v) => void toggle(p, v)} />
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Score:{' '}
              {p.score ? (
                <>
                  <span className="font-semibold text-slate-600">
                    {Number(p.score).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>{' '}
                  · {fmtDateTime(p.scoreSyncedAt)}
                  <button
                    className="ml-1 text-blue-400 hover:text-blue-600"
                    onClick={() => void refresh(p)}
                    aria-label="Refresh score"
                  >
                    <RefreshCw size={11} className="inline" />
                  </button>
                </>
              ) : (
                '--'
              )}
            </p>
            <p className="mt-2 text-xs text-slate-400">{p.kioskId ? 'Kiosk ID:' : 'Store Account:'}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="flex-1 truncate rounded-md bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-500">
                {p.kioskId || p.posAccount || ''}
              </span>
              <button
                aria-label="Copy account"
                onClick={async () => {
                  const text = p.kioskId || p.posAccount;
                  if (!text) return;
                  await navigator.clipboard.writeText(text);
                  setCopiedId(p.id);
                  setTimeout(() => setCopiedId(null), 1200);
                }}
                className={copiedId === p.id ? 'text-green-500' : 'text-slate-300 hover:text-blue-500'}
              >
                <Copy size={13} />
              </button>
            </div>
            <button
              onClick={() => openDetail(p)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-slate-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
            >
              <Eye size={13} /> View Details
            </button>
          </div>
        ))}
      </div>

      <Modal
        title="Edit Platform Account"
        open={!!detail}
        onClose={() => setDetail(null)}
        wide
        footer={
          <>
            <Btn variant="ghost" onClick={() => setDetail(null)}>
              Close
            </Btn>
            <Btn onClick={saveDetail}>Save</Btn>
          </>
        }
      >
        {detail && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Select Platform">
              <TextInput value={detail.name} disabled />
            </Field>
            <Field label="Kiosk ID" required>
              <TextInput
                value={edit.kioskId}
                onChange={(e) => setEdit({ ...edit, kioskId: e.target.value })}
              />
            </Field>
            <Field label="Pos Account" required>
              <TextInput
                value={edit.posAccount}
                onChange={(e) => setEdit({ ...edit, posAccount: e.target.value })}
              />
            </Field>
            <Field label="Pos Password" required>
              <TextInput
                type="password"
                placeholder="••••••••  (unchanged if empty)"
                value={edit.posPassword}
                onChange={(e) => setEdit({ ...edit, posPassword: e.target.value })}
              />
            </Field>
            <Field label="Money Box" required>
              <TextInput
                value={edit.moneyBox}
                onChange={(e) => setEdit({ ...edit, moneyBox: e.target.value })}
              />
            </Field>
            <Field label="Remark">
              <TextInput
                placeholder="Remark (optional)"
                value={edit.remark}
                onChange={(e) => setEdit({ ...edit, remark: e.target.value })}
              />
            </Field>
            <Field label="Score Cost (%)">
              <TextInput
                type="number"
                value={edit.scoreCostPct}
                onChange={(e) => setEdit({ ...edit, scoreCostPct: e.target.value })}
              />
            </Field>
            <Field label="Min Deposit Amount">
              <TextInput
                type="number"
                value={edit.minDeposit}
                onChange={(e) => setEdit({ ...edit, minDeposit: e.target.value })}
              />
            </Field>
            <Field label="Min Redemption Amount">
              <TextInput
                type="number"
                value={edit.minRedemption}
                onChange={(e) => setEdit({ ...edit, minRedemption: e.target.value })}
              />
            </Field>
            <Field label="Redeem Daily Limit">
              <TextInput
                type="number"
                value={edit.redeemDailyLimit}
                onChange={(e) => setEdit({ ...edit, redeemDailyLimit: e.target.value })}
              />
            </Field>
            <Field label="Min. Deposit to Unlock">
              <TextInput
                type="number"
                value={edit.minDepositToUnlock}
                onChange={(e) => setEdit({ ...edit, minDepositToUnlock: e.target.value })}
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
