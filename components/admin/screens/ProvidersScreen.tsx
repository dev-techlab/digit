'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, Btn, Field, Modal, Select, Table, TextInput, Toggle } from '@/components/agent/ui';

interface Provider {
  id: number;
  name: string;
  providerCode: string;
  launchUrlTemplate: string;
  iconUrl: string;
  status: number;
  sort: number;
  createType: number;
  operate: number;
  needInitBalance: number;
  canManualInput: number;
  providerType: 'SC' | 'GC';
  iframeSupported: boolean;
  isMachineSupported: number;
  redeemField: number;
  invalidPasswordState: number;
  canChangePassword: number;
}

type Draft = {
  id: string;
  isNew: boolean;
  name: string;
  providerCode: string;
  launchUrlTemplate: string;
  iconUrl: string;
  status: boolean;
  sort: string;
  providerType: 'SC' | 'GC';
  createType: string;
  operate: string;
  needInitBalance: boolean;
  canManualInput: boolean;
  iframeSupported: boolean;
  isMachineSupported: boolean;
  redeemField: string;
  invalidPasswordState: boolean;
  canChangePassword: boolean;
};

const emptyDraft = (): Draft => ({
  id: '',
  isNew: true,
  name: '',
  providerCode: '',
  launchUrlTemplate: '',
  iconUrl: '',
  status: true,
  sort: '0',
  providerType: 'SC',
  createType: '1',
  operate: '0',
  needInitBalance: false,
  canManualInput: true,
  iframeSupported: false,
  isMachineSupported: false,
  redeemField: '0',
  invalidPasswordState: false,
  canChangePassword: true,
});

function ProviderIcon({ name, iconUrl }: { name: string; iconUrl: string }) {
  const [failed, setFailed] = useState(false);
  if (iconUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-xs font-bold text-white">
      {initials}
    </span>
  );
}

export function ProvidersScreen() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api<{ providers: Provider[] }>('/api/admin/providers')
      .then((d) => setProviders(d.providers))
      .finally(() => setLoading(false));
  useEffect(() => {
    void load();
  }, []);

  const openAdd = () => {
    setError(null);
    setDraft(emptyDraft());
  };
  const openEdit = (p: Provider) => {
    setError(null);
    setDraft({
      id: String(p.id),
      isNew: false,
      name: p.name,
      providerCode: p.providerCode,
      launchUrlTemplate: p.launchUrlTemplate,
      iconUrl: p.iconUrl,
      status: p.status === 1,
      sort: String(p.sort),
      providerType: p.providerType,
      createType: String(p.createType),
      operate: String(p.operate),
      needInitBalance: p.needInitBalance === 1,
      canManualInput: p.canManualInput === 1,
      iframeSupported: p.iframeSupported,
      isMachineSupported: p.isMachineSupported === 1,
      redeemField: String(p.redeemField),
      invalidPasswordState: p.invalidPasswordState === 1,
      canChangePassword: p.canChangePassword === 1,
    });
  };

  const save = async () => {
    if (!draft) return;
    if (draft.isNew && !draft.id.trim()) {
      setError('Provider ID is required.');
      return;
    }
    if (!draft.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!draft.providerCode.trim()) {
      setError('Provider code is required.');
      return;
    }
    if (!draft.launchUrlTemplate.trim()) {
      setError('Launch URL is required.');
      return;
    }
    if (!draft.iconUrl.trim()) {
      setError('Icon URL is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        id: Number(draft.id),
        name: draft.name.trim(),
        providerCode: draft.providerCode.trim(),
        launchUrlTemplate: draft.launchUrlTemplate.trim(),
        iconUrl: draft.iconUrl.trim(),
        providerType: draft.providerType,
        status: draft.status ? 1 : 0,
        sort: Number(draft.sort) || 0,
        createType: Number(draft.createType) || 0,
        operate: Number(draft.operate) || 0,
        needInitBalance: draft.needInitBalance ? 1 : 0,
        canManualInput: draft.canManualInput ? 1 : 0,
        iframeSupported: draft.iframeSupported,
        isMachineSupported: draft.isMachineSupported ? 1 : 0,
        redeemField: Number(draft.redeemField) || 0,
        invalidPasswordState: draft.invalidPasswordState ? 1 : 0,
        canChangePassword: draft.canChangePassword ? 1 : 0,
      };
      await api('/api/admin/providers', {
        method: draft.isNew ? 'POST' : 'PUT',
        body: JSON.stringify(payload),
      });
      setDraft(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save provider.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Provider, active: boolean) => {
    setProviders((rows) => rows.map((r) => (r.id === p.id ? { ...r, status: active ? 1 : 0 } : r)));
    await api('/api/admin/providers', {
      method: 'PUT',
      body: JSON.stringify({ id: p.id, status: active ? 1 : 0 }),
    });
  };

  const remove = async (p: Provider) => {
    if (
      !window.confirm(
        `Permanently delete "${p.name}"? This also removes its deposit tiers and any linked member accounts.`
      )
    )
      return;
    await api(`/api/admin/providers?id=${p.id}`, { method: 'DELETE' });
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Master game provider catalog (mirrors the upstream provider API — edits here are local and
          independent of the sync script).
        </p>
        <Btn onClick={openAdd}>
          <Plus size={15} /> Add Provider
        </Btn>
      </div>

      <Table
        headers={['#', 'Provider', 'Code', 'Type', 'Sort', 'Active', 'Actions']}
        empty={!loading && providers.length === 0}
      >
        {providers.map((p, i) => (
          <tr key={p.id} className="hover:bg-slate-50/60">
            <td className="px-4 py-2.5 text-slate-400">{p.id}</td>
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <ProviderIcon name={p.name} iconUrl={p.iconUrl} />
                <div className="min-w-0">
                  <div className="font-medium text-slate-800">{p.name}</div>
                </div>
              </div>
            </td>
            <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{p.providerCode}</td>
            <td className="px-4 py-2.5">{p.providerType}</td>
            <td className="px-4 py-2.5">{p.sort}</td>
            <td className="px-4 py-2.5">
              <Toggle checked={p.status === 1} onChange={(v) => void toggleActive(p, v)} />
            </td>
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(p)}
                  className="text-slate-400 hover:text-blue-500"
                  aria-label="Edit"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => void remove(p)}
                  className="text-slate-400 hover:text-red-500"
                  aria-label="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <Modal
        title={draft?.isNew ? 'Add Provider' : 'Edit Provider'}
        open={!!draft}
        onClose={() => setDraft(null)}
        wide
        footer={
          <>
            <Btn variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Btn>
            <Btn onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Btn>
          </>
        }
      >
        {draft && (
          <div className="space-y-5">
            {error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Provider ID" required hint={draft.isNew ? 'Numeric, must match upstream id if syncing later.' : 'Immutable.'}>
                <TextInput
                  type="number"
                  value={draft.id}
                  disabled={!draft.isNew}
                  onChange={(e) => setDraft({ ...draft, id: e.target.value })}
                  placeholder="e.g. 51"
                />
              </Field>
              <Field label="Name" required>
                <TextInput
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Golden Dragon"
                />
              </Field>
              <Field label="Provider Code" required>
                <TextInput
                  value={draft.providerCode}
                  onChange={(e) => setDraft({ ...draft, providerCode: e.target.value })}
                  placeholder="goldenDragonCookie"
                />
              </Field>
              <Field label="Provider Type" required>
                <Select
                  value={draft.providerType}
                  onChange={(e) => setDraft({ ...draft, providerType: e.target.value as 'SC' | 'GC' })}
                >
                  <option value="SC">SC — Sweepstakes</option>
                  <option value="GC">GC — Gold Coins</option>
                </Select>
              </Field>
              <Field label="Icon URL" required>
                <TextInput
                  value={draft.iconUrl}
                  onChange={(e) => setDraft({ ...draft, iconUrl: e.target.value })}
                  placeholder="/providers/icon.png"
                />
              </Field>
              <Field label="Launch URL" required>
                <TextInput
                  value={draft.launchUrlTemplate}
                  onChange={(e) => setDraft({ ...draft, launchUrlTemplate: e.target.value })}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Sort">
                <TextInput
                  type="number"
                  value={draft.sort}
                  onChange={(e) => setDraft({ ...draft, sort: e.target.value })}
                />
              </Field>
              <Field label="Active">
                <div className="pt-1.5">
                  <Toggle checked={draft.status} onChange={(v) => setDraft({ ...draft, status: v })} />
                </div>
              </Field>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Upstream integration flags
              </p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Field label="Create Type" hint="Upstream flag">
                  <TextInput
                    type="number"
                    value={draft.createType}
                    onChange={(e) => setDraft({ ...draft, createType: e.target.value })}
                  />
                </Field>
                <Field label="Operate" hint="Upstream flag">
                  <TextInput
                    type="number"
                    value={draft.operate}
                    onChange={(e) => setDraft({ ...draft, operate: e.target.value })}
                  />
                </Field>
                <Field label="Redeem Field" hint="Upstream flag">
                  <TextInput
                    type="number"
                    value={draft.redeemField}
                    onChange={(e) => setDraft({ ...draft, redeemField: e.target.value })}
                  />
                </Field>
                <div className="col-span-2 flex flex-wrap items-center gap-x-6 gap-y-3 md:col-span-4">
                  {(
                    [
                      ['needInitBalance', 'Needs Init Balance'],
                      ['canManualInput', 'Can Manual Input'],
                      ['iframeSupported', 'Iframe Supported'],
                      ['isMachineSupported', 'Machine Supported'],
                      ['invalidPasswordState', 'Invalid Password State'],
                      ['canChangePassword', 'Can Change Password'],
                    ] as [keyof Draft, string][]
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm text-slate-600">
                      <Toggle
                        checked={draft[key] as boolean}
                        onChange={(v) => setDraft({ ...draft, [key]: v })}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
