'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, Btn, Field, Modal, Select, Table, TextInput, Toggle } from '@/components/agent/ui';

interface Bonus {
  id: string;
  title: string;
  description: string;
  tags: string[];
  active: boolean;
  bannerType: 'placeholder' | 'gradient';
  bannerGradient: string | null;
  bannerBadgeIcon: 'coin' | 'percent' | null;
  bannerBadgeText: string | null;
  scheduleIcon: 'calendar' | 'clock';
  scheduleText: string;
  scheduleCountdownSeconds: number | null;
  sort: number;
}

type Draft = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  tags: string;
  active: boolean;
  bannerType: 'placeholder' | 'gradient';
  bannerGradient: string;
  bannerBadgeIcon: '' | 'coin' | 'percent';
  bannerBadgeText: string;
  scheduleIcon: 'calendar' | 'clock';
  scheduleText: string;
  scheduleCountdownSeconds: string;
  sort: string;
};

const emptyDraft = (): Draft => ({
  slug: '',
  title: '',
  description: '',
  tags: '',
  active: true,
  bannerType: 'placeholder',
  bannerGradient: '',
  bannerBadgeIcon: '',
  bannerBadgeText: '',
  scheduleIcon: 'calendar',
  scheduleText: '',
  scheduleCountdownSeconds: '',
  sort: '0',
});

/** Bonus Center definitions — read live by the player app's /bonus page (lib/data.ts#getBonuses). */
export function BonusesScreen() {
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api<{ bonuses: Bonus[] }>('/api/admin/bonuses')
      .then((d) => setBonuses(d.bonuses))
      .finally(() => setLoading(false));
  useEffect(() => {
    void load();
  }, []);

  const openAdd = () => {
    setError(null);
    setDraft(emptyDraft());
  };
  const openEdit = (b: Bonus) => {
    setError(null);
    setDraft({
      id: b.id,
      slug: b.id,
      title: b.title,
      description: b.description,
      tags: b.tags.join(', '),
      active: b.active,
      bannerType: b.bannerType,
      bannerGradient: b.bannerGradient ?? '',
      bannerBadgeIcon: b.bannerBadgeIcon ?? '',
      bannerBadgeText: b.bannerBadgeText ?? '',
      scheduleIcon: b.scheduleIcon,
      scheduleText: b.scheduleText,
      scheduleCountdownSeconds: b.scheduleCountdownSeconds != null ? String(b.scheduleCountdownSeconds) : '',
      sort: String(b.sort),
    });
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!draft.description.trim()) {
      setError('Description is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...(draft.id ? { id: draft.id } : { id: draft.slug.trim() }),
        title: draft.title.trim(),
        description: draft.description.trim(),
        tags: draft.tags
          .split(',')
          .map((t) => t.trim().toUpperCase())
          .filter(Boolean),
        active: draft.active,
        bannerType: draft.bannerType,
        bannerGradient: draft.bannerGradient.trim(),
        bannerBadgeIcon: draft.bannerBadgeIcon || null,
        bannerBadgeText: draft.bannerBadgeText.trim(),
        scheduleIcon: draft.scheduleIcon,
        scheduleText: draft.scheduleText.trim(),
        scheduleCountdownSeconds: draft.scheduleCountdownSeconds.trim()
          ? Number(draft.scheduleCountdownSeconds)
          : null,
        sort: Number(draft.sort) || 0,
      };
      await api('/api/admin/bonuses', {
        method: draft.id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      setDraft(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save bonus.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (b: Bonus, active: boolean) => {
    setBonuses((rows) => rows.map((r) => (r.id === b.id ? { ...r, active } : r)));
    try {
      await api('/api/admin/bonuses', { method: 'PUT', body: JSON.stringify({ id: b.id, active }) });
    } catch {
      setBonuses((rows) => rows.map((r) => (r.id === b.id ? { ...r, active: !active } : r)));
    }
  };

  const remove = async (b: Bonus) => {
    if (
      !window.confirm(
        `Delete "${b.title}"? It disappears from this list and the player Bonus Center. Player claim history for it is kept untouched.`
      )
    )
      return;
    try {
      await api(`/api/admin/bonuses?id=${encodeURIComponent(b.id)}`, { method: 'DELETE' });
      void load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Failed to delete bonus.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Bonus Center definitions — shown live on the player app&apos;s Bonus page.
        </p>
        <Btn onClick={openAdd}>
          <Plus size={15} /> Add Bonus
        </Btn>
      </div>

      <Table
        headers={['Title', 'Tags', 'Banner', 'Schedule', 'Sort', 'Active', 'Actions']}
        empty={!loading && bonuses.length === 0}
      >
        {bonuses.map((b) => (
          <tr key={b.id} className="hover:bg-slate-50/60">
            <td className="px-4 py-2.5">
              <div className="font-medium text-slate-800">{b.title}</div>
              <div className="truncate text-xs text-slate-400">{b.id}</div>
            </td>
            <td className="px-4 py-2.5">
              <div className="flex flex-wrap gap-1">
                {b.tags.map((t) => (
                  <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                    {t}
                  </span>
                ))}
              </div>
            </td>
            <td className="px-4 py-2.5 text-xs text-slate-500">
              {b.bannerType === 'gradient' ? `Gradient${b.bannerBadgeText ? ` · ${b.bannerBadgeText}` : ''}` : 'Placeholder'}
            </td>
            <td className="px-4 py-2.5 text-xs text-slate-500">
              {b.scheduleText || (b.scheduleCountdownSeconds != null ? `Countdown ${b.scheduleCountdownSeconds}s` : '-')}
            </td>
            <td className="px-4 py-2.5">{b.sort}</td>
            <td className="px-4 py-2.5">
              <Toggle checked={b.active} onChange={(v) => void toggleActive(b, v)} />
            </td>
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(b)}
                  className="text-slate-400 hover:text-blue-500"
                  aria-label="Edit"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => void remove(b)}
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
        title={draft?.id ? 'Edit Bonus' : 'Add Bonus'}
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
              <Field label="Title" required>
                <TextInput
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="e.g. Daily Check-in Rewards"
                />
              </Field>
              {!draft.id && (
                <Field label="Slug (ID)" hint="Leave blank to auto-generate from the title.">
                  <TextInput
                    value={draft.slug}
                    onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                    placeholder="daily-checkin"
                  />
                </Field>
              )}
              <Field label="Tags" hint="Comma-separated, e.g. VIP, LONG-TERM">
                <TextInput
                  value={draft.tags}
                  onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                  placeholder="FIRST DEPOSIT"
                />
              </Field>
              <Field label="Sort">
                <TextInput
                  type="number"
                  value={draft.sort}
                  onChange={(e) => setDraft({ ...draft, sort: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Description" required>
              <TextInput
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Get up to 15% extra SC on your first deposit"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Banner Type">
                <Select
                  value={draft.bannerType}
                  onChange={(e) => setDraft({ ...draft, bannerType: e.target.value as Draft['bannerType'] })}
                >
                  <option value="placeholder">Placeholder</option>
                  <option value="gradient">Gradient</option>
                </Select>
              </Field>
              <Field label="Active">
                <div className="pt-1.5">
                  <Toggle checked={draft.active} onChange={(v) => setDraft({ ...draft, active: v })} />
                </div>
              </Field>
              {draft.bannerType === 'gradient' && (
                <>
                  <Field label="Gradient classes" hint="Tailwind, e.g. from-fuchsia-600 via-rose-600 to-orange-600">
                    <TextInput
                      value={draft.bannerGradient}
                      onChange={(e) => setDraft({ ...draft, bannerGradient: e.target.value })}
                    />
                  </Field>
                  <Field label="Badge Icon">
                    <Select
                      value={draft.bannerBadgeIcon}
                      onChange={(e) =>
                        setDraft({ ...draft, bannerBadgeIcon: e.target.value as Draft['bannerBadgeIcon'] })
                      }
                    >
                      <option value="">None</option>
                      <option value="coin">Coin</option>
                      <option value="percent">Percent</option>
                    </Select>
                  </Field>
                  <Field label="Badge Text">
                    <TextInput
                      value={draft.bannerBadgeText}
                      onChange={(e) => setDraft({ ...draft, bannerBadgeText: e.target.value })}
                      placeholder="+15%"
                    />
                  </Field>
                </>
              )}
              <Field label="Schedule Icon">
                <Select
                  value={draft.scheduleIcon}
                  onChange={(e) => setDraft({ ...draft, scheduleIcon: e.target.value as Draft['scheduleIcon'] })}
                >
                  <option value="calendar">Calendar</option>
                  <option value="clock">Clock</option>
                </Select>
              </Field>
              <Field label="Schedule Text" hint="Ignored if a countdown is set.">
                <TextInput
                  value={draft.scheduleText}
                  onChange={(e) => setDraft({ ...draft, scheduleText: e.target.value })}
                  placeholder="Every Day"
                />
              </Field>
              <Field label="Countdown (seconds)" hint="Leave blank for no countdown.">
                <TextInput
                  type="number"
                  value={draft.scheduleCountdownSeconds}
                  onChange={(e) => setDraft({ ...draft, scheduleCountdownSeconds: e.target.value })}
                  placeholder="86400"
                />
              </Field>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
