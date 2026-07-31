'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import {
  api,
  Btn,
  Field,
  Modal,
  Select,
  TextInput,
  Toggle,
  fmtDateTime,
} from '@/components/agent/ui';
import { DataTable } from '@/components/ui/DataTable';
import { useActionModal } from '@/hooks/useActionModal';
import Link from 'next/link';

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
  agentCount: number;
  customerCount: number;
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

import { getLocalImageUrl } from '@/lib/image';

function PlatformIcon({ name, iconUrl }: { name: string; iconUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  if (iconUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getLocalImageUrl(iconUrl)}
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);

  const draftModal = useActionModal<Draft>();
  const [draft, setDraft] = useState<Draft | null>(null);

  const agentsModal = useActionModal<Platform>();
  const [connectedAgents, setConnectedAgents] = useState<any[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentSearch, setAgentSearch] = useState('');

  const deleteModal = useActionModal<Platform>();

  const load = () =>
    api<{ platforms: Platform[] }>('/api/admin/platforms')
      .then((d) => setPlatforms(d.platforms))
      .finally(() => setLoading(false));
  useEffect(() => {
    void load();
  }, []);

  const openAdd = () => {
    const d = emptyDraft();
    setDraft(d);
    draftModal.openModal(d);
  };
  const openEdit = (p: Platform) => {
    const d: Draft = {
      id: p.id,
      name: p.name,
      slug: p.slug,
      iconUrl: p.iconUrl ?? '',
      providerCode: p.providerCode ?? '',
      providerType: p.providerType ?? 'SC',
      launchUrl: p.launchUrl ?? '',
      sort: String(p.sort),
      isActive: p.isActive,
    };
    setDraft(d);
    draftModal.openModal(d);
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      draftModal.setErr('Name is required.');
      return;
    }
    draftModal.setBusy(true);
    draftModal.setErr(null);
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
      draftModal.closeModal();
      await load();
    } catch (e) {
      draftModal.setErr(e instanceof Error ? e.message : 'Failed to save platform.');
    } finally {
      draftModal.setBusy(false);
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

  const confirmDelete = async () => {
    if (!deleteModal.item) return;
    deleteModal.setBusy(true);
    try {
      await api(`/api/admin/platforms?id=${encodeURIComponent(deleteModal.item.id)}`, {
        method: 'DELETE',
      });
      deleteModal.closeModal();
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Failed to delete platform.');
    } finally {
      deleteModal.setBusy(false);
    }
  };

  const openAgentsModal = async (p: Platform) => {
    agentsModal.openModal(p);
    setAgentSearch('');
    await loadAgents(p.id, '');
  };

  const loadAgents = async (platformId: string, search: string) => {
    setAgentsLoading(true);
    try {
      const data = await api<{ agents: any[] }>(
        `/api/admin/platforms/${platformId}/agents?search=${encodeURIComponent(search)}`
      );
      setConnectedAgents(data.agents);
    } catch (e) {
      console.error('Failed to load agents', e);
    } finally {
      setAgentsLoading(false);
    }
  };

  useEffect(() => {
    if (agentsModal.item && agentsModal.open) {
      const timeoutId = setTimeout(() => {
        void loadAgents(agentsModal.item!.id, agentSearch);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentSearch]);

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

      <DataTable
        data={platforms}
        rowKey={(p) => p.id}
        columns={[
          {
            header: 'Platform',
            accessorKey: 'name',
            cell: (p) => (
              <div className="flex items-center gap-2.5">
                <PlatformIcon name={p.name} iconUrl={p.iconUrl} />
                <div className="min-w-0">
                  <div className="font-medium text-slate-800">{p.name}</div>
                  <div className="truncate text-xs text-slate-400">{p.slug}</div>
                </div>
              </div>
            ),
          },
          {
            header: 'Code',
            accessorKey: 'providerCode',
            cell: (p) => (
              <span className="font-mono text-xs text-slate-500">{p.providerCode || '--'}</span>
            ),
          },
          {
            header: 'Type',
            accessorKey: 'providerType',
            cell: (p) => p.providerType || '--',
          },
          {
            header: 'Agents Count',
            accessorKey: 'agentCount',
            cell: (p) => <span className="font-medium text-blue-600">{p.agentCount ?? 0}</span>,
          },
          {
            header: 'Customers Count',
            accessorKey: 'customerCount',
            cell: (p) => (
              <span className="font-medium text-emerald-600">{p.customerCount ?? 0}</span>
            ),
          },
          {
            header: 'Sort',
            accessorKey: 'sort',
          },
          {
            header: 'Active',
            accessorKey: 'isActive',
            cell: (p) => <Toggle checked={p.isActive} onChange={(v) => void toggleActive(p, v)} />,
          },
          {
            header: 'Actions',
            enableSorting: false,
            enableGlobalFilter: false,
            cell: (p) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAgentsModal(p)}
                  className="text-slate-400 hover:text-green-500"
                  aria-label="Connected Agents"
                  title="View Connected Agents"
                >
                  <Users size={15} />
                </button>
                <button
                  onClick={() => openEdit(p)}
                  className="text-slate-400 hover:text-blue-500"
                  aria-label="Edit"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => deleteModal.openModal(p)}
                  className="text-slate-400 hover:text-red-500"
                  aria-label="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        title={draft?.id ? 'Edit Platform' : 'Add Platform'}
        open={draftModal.open}
        onClose={draftModal.closeModal}
        wide
        footer={
          <>
            <Btn variant="ghost" onClick={draftModal.closeModal}>
              Cancel
            </Btn>
            <Btn onClick={save} disabled={draftModal.busy}>
              {draftModal.busy ? 'Saving…' : 'Save'}
            </Btn>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            {draftModal.err && (
              <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
                {draftModal.err}
              </p>
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

      <Modal
        title={`Connected Agents - ${agentsModal.item?.name}`}
        open={agentsModal.open}
        onClose={agentsModal.closeModal}
        wide
        footer={<Btn onClick={agentsModal.closeModal}>Close</Btn>}
      >
        <div className="space-y-4">
          <TextInput
            placeholder="Search agents by username, nickname or email..."
            value={agentSearch}
            onChange={(e) => setAgentSearch(e.target.value)}
          />
          {agentsLoading ? (
            <div className="py-8 text-center text-slate-500">Loading...</div>
          ) : (
            <DataTable
              data={connectedAgents}
              rowKey={(a) => a.id}
              columns={[
                {
                  header: 'Username',
                  accessorKey: 'username',
                  cell: (a) => (
                    <Link
                      href={`/admin/agents/${a.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {a.username}
                    </Link>
                  ),
                },
                {
                  header: 'Nickname',
                  accessorKey: 'nickname',
                  cell: (a) => a.nickname || '-',
                },
                {
                  header: 'Email',
                  accessorKey: 'email',
                  cell: (a) => a.email || '-',
                },
                {
                  header: 'Status',
                  accessorKey: 'status',
                  cell: (a) => (
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium capitalize ${a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {a.status}
                    </span>
                  ),
                },
                {
                  header: 'Assigned At',
                  accessorKey: 'assignedAt',
                  cell: (a) => (
                    <span className="text-xs text-slate-500">{fmtDateTime(a.assignedAt)}</span>
                  ),
                },
              ]}
            />
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title="Delete Platform"
        open={deleteModal.open}
        onClose={deleteModal.closeModal}
        footer={
          <>
            <Btn variant="ghost" onClick={deleteModal.closeModal}>
              Cancel
            </Btn>
            <Btn variant="danger" onClick={confirmDelete} disabled={deleteModal.busy}>
              {deleteModal.busy ? 'Deleting…' : 'Delete'}
            </Btn>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <strong>{deleteModal.item?.name}</strong>?
          </p>
          <p className="text-sm text-slate-500">
            It will disappear from this list and from every store&apos;s Game Setting screen.
            Existing store configs, member game-account bindings, and transaction history are kept
            untouched.
          </p>
        </div>
      </Modal>
    </div>
  );
}
