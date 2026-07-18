'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, Btn, Field, Modal, Select, Table, TextInput, Toggle } from '@/components/agent/ui';

interface Platform {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  externalId: number | null;
  providerCode: string | null;
  providerType: string | null;
  launchUrl: string | null;
  sort: number;
  isActive: boolean;
}

type Draft = {
  id?: string;
  name: string;
  slug: string;
  iconUrl: string;
  providerCode: string;
  providerType: string;
  launchUrl: string;
  sort: string;
  isActive: boolean;
};

const emptyDraft = (): Draft => ({
  name: '',
  slug: '',
  iconUrl: '',
  providerCode: '',
  providerType: 'SC',
  launchUrl: '',
  sort: '0',
  isActive: true,
});

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

/** Master `game_platforms` catalog — shared across every store tenant on the agent panel. */
export function PlatformsScreen() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api<{ platforms: Platform[] }>('/api/admin/platforms')
      .then((d) => setPlatforms(d.platforms))
      .finally(() => setLoading(false));
  useEffect(() => {
    void load();
  }, []);

  const openAdd = () => {
    setError(null);
    setDraft(emptyDraft());
  };
  const openEdit = (p: Platform) => {
    setError(null);
    setDraft({
      id: p.id,
      name: p.name,
      slug: p.slug,
      iconUrl: p.iconUrl ?? '',
      providerCode: p.providerCode ?? '',
      providerType: p.providerType ?? 'SC',
      launchUrl: p.launchUrl ?? '',
      sort: String(p.sort),
      isActive: p.isActive,
    });
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...(draft.id ? { id: draft.id } : {}),
        name: draft.name.trim(),
        slug: draft.slug.trim(),
        iconUrl: draft.iconUrl.trim(),
        providerCode: draft.providerCode.trim(),
        providerType: draft.providerType,
        launchUrl: draft.launchUrl.trim(),
        sort: Number(draft.sort) || 0,
        isActive: draft.isActive,
      };
      await api('/api/admin/platforms', {
        method: draft.id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      setDraft(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save platform.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Platform, isActive: boolean) => {
    setPlatforms((rows) => rows.map((r) => (r.id === p.id ? { ...r, isActive } : r)));
    try {
      await api('/api/admin/platforms', {
        method: 'PUT',
        body: JSON.stringify({ id: p.id, isActive }),
      });
    } catch {
      setPlatforms((rows) => rows.map((r) => (r.id === p.id ? { ...r, isActive: !isActive } : r)));
    }
  };

  const remove = async (p: Platform) => {
    if (
      !window.confirm(
        `Deactivate "${p.name}"? It will be hidden from stores but its history is kept.`
      )
    )
      return;
    try {
      await api(`/api/admin/platforms?id=${encodeURIComponent(p.id)}`, { method: 'DELETE' });
      void load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Failed to deactivate platform.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Master game platform catalog. Add or edit platforms here — stores then configure their own
          accounts under Game Setting.
        </p>
        <Btn onClick={openAdd}>
          <Plus size={15} /> Add Platform
        </Btn>
      </div>

      <Table
        headers={['#', 'Platform', 'Code', 'Type', 'Sort', 'Active', 'Actions']}
        empty={!loading && platforms.length === 0}
      >
        {platforms.map((p, i) => (
          <tr key={p.id} className="hover:bg-slate-50/60">
            <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <PlatformIcon name={p.name} iconUrl={p.iconUrl} />
                <div className="min-w-0">
                  <div className="font-medium text-slate-800">{p.name}</div>
                  <div className="truncate text-xs text-slate-400">{p.slug}</div>
                </div>
              </div>
            </td>
            <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
              {p.providerCode || '--'}
            </td>
            <td className="px-4 py-2.5">{p.providerType || '--'}</td>
            <td className="px-4 py-2.5">{p.sort}</td>
            <td className="px-4 py-2.5">
              <Toggle checked={p.isActive} onChange={(v) => void toggleActive(p, v)} />
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
                  aria-label="Deactivate"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <Modal
        title={draft?.id ? 'Edit Platform' : 'Add Platform'}
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
          <div className="space-y-4">
            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Name" required>
                <TextInput
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Orion Stars"
                />
              </Field>
              <Field label="Slug" hint="Leave blank to auto-generate from the name.">
                <TextInput
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                  placeholder="orion-stars"
                />
              </Field>
              <Field label="Icon URL">
                <TextInput
                  value={draft.iconUrl}
                  onChange={(e) => setDraft({ ...draft, iconUrl: e.target.value })}
                  placeholder="https://…/icon.png"
                />
              </Field>
              <Field label="Provider Code">
                <TextInput
                  value={draft.providerCode}
                  onChange={(e) => setDraft({ ...draft, providerCode: e.target.value })}
                  placeholder="orionStars"
                />
              </Field>
              <Field label="Provider Type">
                <Select
                  value={draft.providerType}
                  onChange={(e) => setDraft({ ...draft, providerType: e.target.value })}
                >
                  <option value="SC">SC — Sweepstakes</option>
                  <option value="GC">GC — Gold Coins</option>
                </Select>
              </Field>
              <Field label="Sort">
                <TextInput
                  type="number"
                  value={draft.sort}
                  onChange={(e) => setDraft({ ...draft, sort: e.target.value })}
                />
              </Field>
              <Field label="Launch URL">
                <TextInput
                  value={draft.launchUrl}
                  onChange={(e) => setDraft({ ...draft, launchUrl: e.target.value })}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Active">
                <div className="pt-1.5">
                  <Toggle
                    checked={draft.isActive}
                    onChange={(v) => setDraft({ ...draft, isActive: v })}
                  />
                </div>
              </Field>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
