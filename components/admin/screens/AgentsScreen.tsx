'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDataTable } from '@/hooks/useDataTable';
import { useActionModal } from '@/hooks/useActionModal';
import Link from 'next/link';
import { Copy, Edit, Plus } from 'lucide-react';
import {
  api,
  Btn,
  Card,
  Field,
  fmtDateTime,
  fmtMoney,
  Modal,
  TextInput,
} from '@/components/agent/ui';
import { DataTable } from '@/components/ui/DataTable';

interface AgentRow {
  id: string;
  username: string;
  nickname: string | null;
  email: string | null;
  inviteCode: string;
  commissionPer: string;
  onlineBalance: string;
  status: 'active' | 'disabled';
  remark: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

interface PlatformOption {
  id: string;
  name: string;
  assigned: boolean;
  availableFromTime?: string;
  availableToTime?: string;
}

/** Top-level store/agent accounts — the B2B side that resells game credits to members. */
export function AgentsScreen() {
  const table = useDataTable<AgentRow>('/api/admin/agents', 'agents');
  const [busyId, setBusyId] = useState<string | null>(null);

  const emptyForm = () => {
    const randomChars = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

    return {
      username: '',
      password: '',
      nickname: '',
      email: '',
      commissionPer: '0.00',
      inviteCode: `MC${randomChars}`,
      onlineBalance: '0',
      remark: '',
    };
  };

  const createModal = useActionModal<null>();
  const [form, setForm] = useState(emptyForm());


  const [created, setCreated] = useState<{ username: string; password: string } | null>(null);

  const deleteModal = useActionModal<AgentRow>();

  const editModal = useActionModal<AgentRow>();
  const [editForm, setEditForm] = useState({
    username: '',
    nickname: '',
    email: '',
    commissionPer: '0',
    inviteCode: '',
    onlineBalance: '0',
    remark: '',
  });

  const [platforms, setPlatforms] = useState<PlatformOption[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [gameSearch, setGameSearch] = useState('');

  // SWR fetches automatically; no manual useEffect needed

  const loadPlatforms = useCallback(async (agentId?: string) => {
    if (agentId) {
      const data = await api<{
        platforms: Array<{
          id: string;
          name: string;
          assigned: boolean;
          availableFromTime?: string;
          availableToTime?: string;
        }>;
      }>(`/api/admin/agent-platforms?agentId=${encodeURIComponent(agentId)}`);
      setPlatforms(data.platforms);
      setSelectedPlatforms(data.platforms.filter((p) => p.assigned).map((p) => p.id));
      return;
    }

    const data = await api<{ platforms: Array<{ id: string; name: string; isActive?: boolean }> }>(
      '/api/admin/platforms'
    );
    const options = data.platforms
      .filter((platform) => platform.isActive !== false)
      .map((platform) => ({ id: platform.id, name: platform.name, assigned: false }));
    setPlatforms(options);
    setSelectedPlatforms([]);
    setGameSearch('');
  }, []);

  const create = async () => {
    createModal.setErr(null);
    if (!form.username.trim() || !form.password) {
      createModal.setErr('Username and password are required.');
      return;
    }
    createModal.setBusy(true);
    try {
      const payload: any = {
        username: form.username,
        password: form.password,
        nickname: form.nickname,
        email: form.email,
        commissionPer: form.commissionPer,
        inviteCode: form.inviteCode,
        remark: form.remark,
      };

      if (form.onlineBalance !== '') payload.onlineBalance = Number(form.onlineBalance);

      const agentData = await api<{ agent: { id: string; username: string; password: string } }>(
        '/api/admin/agents',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      if (selectedPlatforms.length > 0) {
        await api('/api/admin/agent-platforms', {
          method: 'PUT',
          body: JSON.stringify({
            agentId: agentData.agent.id,
            assignments: selectedPlatforms.map((id) => ({ platformId: id })),
          }),
        });
      }

      setCreated({ username: agentData.agent.username, password: agentData.agent.password });
      setForm(emptyForm());
      setSelectedPlatforms([]);
      setGameSearch('');
      void table.reload();
      createModal.closeModal();
    } catch (e) {
      createModal.setErr(e instanceof Error ? e.message : 'Failed to create agent.');
    } finally {
      createModal.setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!editModal.item) return;
    editModal.setErr(null);
    editModal.setBusy(true);
    try {
      const payload: any = {
        id: editModal.item.id,
        username: editForm.username,
        nickname: editForm.nickname,
        email: editForm.email,
        commissionPer: editForm.commissionPer,
        inviteCode: editForm.inviteCode,
        remark: editForm.remark,
      };

      if (editForm.onlineBalance !== '') payload.onlineBalance = Number(editForm.onlineBalance);

      await api('/api/admin/agents', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      await api('/api/admin/agent-platforms', {
        method: 'PUT',
        body: JSON.stringify({
          agentId: editModal.item.id,
          assignments: selectedPlatforms.map((id) => ({ platformId: id })),
        }),
      });
      void table.reload();
      editModal.closeModal();
    } catch (e) {
      editModal.setErr(e instanceof Error ? e.message : 'Failed to update agent.');
    } finally {
      editModal.setBusy(false);
    }
  };

  const deleteAgent = async () => {
    if (!deleteModal.item) return;
    deleteModal.setErr(null);
    deleteModal.setBusy(true);
    try {
      await api(`/api/admin/agents?id=${deleteModal.item.id}`, { method: 'DELETE' });
      void table.reload();
      deleteModal.closeModal();
    } catch (e) {
      deleteModal.setErr(e instanceof Error ? e.message : 'Failed to delete agent.');
    } finally {
      deleteModal.setBusy(false);
    }
  };

  const toggleStatus = async (row: AgentRow) => {
    const next = row.status === 'active' ? 'disabled' : 'active';
    setBusyId(row.id);
    table.setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
    try {
      await api('/api/admin/agents', {
        method: 'PUT',
        body: JSON.stringify({ id: row.id, status: next }),
      });
    } catch (e) {
      table.setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: row.status } : r)));
      window.alert(e instanceof Error ? e.message : 'Failed to update status.');
    } finally {
      setBusyId(null);
    }
  };

  const renderGameSelector = (label = 'Platforms') => {
    const filtered = platforms.filter((p) =>
      p.name.toLowerCase().includes(gameSearch.toLowerCase())
    );

    return (
      <Field label={label}>
        <div className="space-y-2 rounded-lg border border-slate-200">
          <div className="border-b border-slate-100 p-3">
            <TextInput
              placeholder="Search platforms..."
              value={gameSearch}
              onChange={(e) => setGameSearch(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="max-h-56 space-y-0 overflow-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-500">No matching platforms.</p>
            ) : (
              filtered.map((platform) => {
                const checked = selectedPlatforms.includes(platform.id);
                return (
                  <div
                    key={platform.id}
                    className={
                      checked
                        ? 'border-b border-slate-50 bg-blue-50/40'
                        : 'border-b border-slate-50 last:border-b-0'
                    }
                  >
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50/60">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedPlatforms((current) => {
                            if (current.includes(platform.id)) {
                              return current.filter((id) => id !== platform.id);
                            }
                            return [...current, platform.id];
                          });
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="flex-1 font-medium">{platform.name}</span>
                    </label>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Field>
    );
  };

  return (
    <div className="space-y-5">
      <Card>
        <Btn
          variant="success"
          className="mb-4"
          onClick={async () => {
            setForm(emptyForm());
            setSelectedPlatforms([]);
            setGameSearch('');
            await loadPlatforms();
            createModal.openModal(null);
          }}
        >
          <Plus size={16} /> Add Agent
        </Btn>
        <DataTable
          data={table.rows}
          rowKey={(r) => r.id}
          manualPagination
          totalRows={table.total}
          currentPage={table.page}
          onPageChange={(p) => table.setPage(p)}
          globalSearch={table.search}
          onSearchChange={(v) => {
            table.setSearch(v);
            table.setPage(1);
          }}
          columns={[
            {
              header: 'Username',
              accessorKey: 'username',
              cell: (r) => (
                <Link
                  href={`/admin/agents/${r.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {r.username}
                </Link>
              ),
            },
            {
              header: 'Nickname',
              accessorKey: 'nickname',
              cell: (r) => r.nickname ?? '-',
            },
            {
              header: 'Email',
              accessorKey: 'email',
              cell: (r) => r.email ?? '-',
            },
            {
              header: 'Withdraw Comm. %',
              accessorKey: 'commissionPer',
              cell: (r) => r.commissionPer ?? '-',
            },
            {
              header: 'Online Balance',
              accessorKey: 'onlineBalance',
              cell: (r) => (
                <span className="font-semibold text-green-600">{fmtMoney(r.onlineBalance)}</span>
              ),
            },
            {
              header: 'Invite Code',
              accessorKey: 'inviteCode',
              cell: (r) => <span className="font-mono text-xs text-slate-500">{r.inviteCode}</span>,
            },
            {
              header: 'Last Login',
              accessorKey: 'lastLoginAt',
              cell: (r) => fmtDateTime(r.lastLoginAt),
            },
            {
              header: 'Created',
              accessorKey: 'createdAt',
              cell: (r) => fmtDateTime(r.createdAt),
            },
            {
              header: 'Status',
              accessorKey: 'status',
              cell: (r) => (
                <span
                  className={
                    r.status === 'active'
                      ? 'rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-600'
                      : 'rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-500'
                  }
                >
                  {r.status === 'active' ? 'Active' : 'Disabled'}
                </span>
              ),
            },
            {
              header: 'Operations',
              enableSorting: false,
              enableGlobalFilter: false,
              cell: (r) => (
                <div className="flex items-center gap-2">
                  <Btn
                    variant="ghost"
                    className="px-1 text-xs"
                    disabled={editModal.busy && editModal.item?.id === r.id}
                    onClick={() => {
                      setEditForm({
                        username: r.username,
                        nickname: r.nickname ?? '',
                        email: r.email ?? '',
                        commissionPer: r.commissionPer,
                        inviteCode: r.inviteCode,
                        onlineBalance: r.onlineBalance ? String(r.onlineBalance) : '0',
                        remark: r.remark ?? '',
                      });
                      void loadPlatforms(r.id);
                      editModal.openModal(r);
                    }}
                  >
                    <Edit size={14} />
                  </Btn>
                  <Btn
                    variant={r.status === 'active' ? 'danger' : 'success'}
                    className="px-3 py-1.5 text-xs"
                    disabled={busyId === r.id}
                    onClick={() => void toggleStatus(r)}
                  >
                    {r.status === 'active' ? 'Block Access' : 'Restore Access'}
                  </Btn>
                  <Btn
                    variant="danger"
                    className="px-3 py-1.5 text-xs ml-1 bg-red-600 hover:bg-red-700"
                    disabled={busyId === r.id || (deleteModal.busy && deleteModal.item?.id === r.id)}
                    onClick={() => deleteModal.openModal(r)}
                  >
                    Delete
                  </Btn>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="Add Agent"
        open={createModal.open}
        onClose={createModal.closeModal}
        footer={
          <>
            <Btn variant="ghost" onClick={createModal.closeModal}>
              Cancel
            </Btn>
            <Btn onClick={create} disabled={createModal.busy}>
              {createModal.busy ? 'Creating…' : 'Confirm'}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          {createModal.err && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{createModal.err}</p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Username" required>
              <TextInput
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Min. 4 characters"
              />
            </Field>
            <Field label="Password" required>
              <TextInput
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 6 characters"
              />
            </Field>
            <Field label="Nickname">
              <TextInput
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <TextInput
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Withdraw Comm.">
              <div className="relative">
                <TextInput
                  type="number"
                  value={form.commissionPer}
                  onChange={(e) => setForm({ ...form, commissionPer: e.target.value })}
                  className="pr-8"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-sm text-slate-400">%</span>
                </div>
              </div>
            </Field>
            <Field label="Invite Code">
              <TextInput
                value={form.inviteCode}
                onChange={(e) => setForm({ ...form, inviteCode: e.target.value })}
              />
            </Field>
            <Field label="Online Balance">
              <TextInput
                type="number"
                step="0.01"
                value={form.onlineBalance}
                onChange={(e) => setForm({ ...form, onlineBalance: e.target.value })}
              />
            </Field>
          </div>
          {renderGameSelector('Platforms')}
          <Field label="Remark">
            <TextInput
              value={form.remark}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
              placeholder="Optional note"
            />
          </Field>
        </div>
      </Modal>

      <Modal
        title="Agent Created"
        open={!!created}
        onClose={() => setCreated(null)}
        footer={<Btn onClick={() => setCreated(null)}>Done</Btn>}
      >
        {created && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Save these credentials now — this is the only time the password is shown.
            </p>
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Username</span>
                <span className="font-mono font-semibold text-slate-700">{created.username}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Password</span>
                <span className="font-mono font-semibold text-slate-700">{created.password}</span>
              </div>
            </div>
            <Btn
              variant="ghost"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(`${created.username} / ${created.password}`)
                  .catch(() => {});
              }}
            >
              <Copy size={14} /> Copy credentials
            </Btn>
          </div>
        )}
      </Modal>

      <Modal
        title="Edit Agent"
        open={editModal.open}
        onClose={editModal.closeModal}
        footer={
          <>
            <Btn variant="ghost" onClick={editModal.closeModal}>
              Cancel
            </Btn>
            <Btn onClick={saveEdit} disabled={editModal.busy}>
              {editModal.busy ? 'Saving…' : 'Save'}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          {editModal.err && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{editModal.err}</p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Username">
              <TextInput
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
              />
            </Field>
            <Field label="Nickname">
              <TextInput
                value={editForm.nickname}
                onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <TextInput
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </Field>
            <Field label="Withdraw Comm.">
              <div className="relative">
                <TextInput
                  type="number"
                  value={editForm.commissionPer}
                  onChange={(e) => setEditForm({ ...editForm, commissionPer: e.target.value })}
                  className="pr-8"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-sm text-slate-400">%</span>
                </div>
              </div>
            </Field>
            <Field label="Invite Code">
              <TextInput
                value={editForm.inviteCode}
                onChange={(e) => setEditForm({ ...editForm, inviteCode: e.target.value })}
              />
            </Field>
            <Field label="Online Balance">
              <TextInput
                type="number"
                step="0.01"
                value={editForm.onlineBalance}
                onChange={(e) => setEditForm({ ...editForm, onlineBalance: e.target.value })}
              />
            </Field>
          </div>
          {renderGameSelector('Platforms')}
          <Field label="Remark">
            <TextInput
              value={editForm.remark}
              onChange={(e) => setEditForm({ ...editForm, remark: e.target.value })}
              placeholder="Optional note"
            />
          </Field>
        </div>
      </Modal>

      <Modal
        title="Confirm Delete"
        open={deleteModal.open}
        onClose={deleteModal.closeModal}
        footer={
          <>
            <Btn variant="ghost" onClick={deleteModal.closeModal}>
              Cancel
            </Btn>
            <Btn variant="danger" onClick={deleteAgent} disabled={deleteModal.busy}>
              {deleteModal.busy ? 'Deleting…' : 'Delete'}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          {deleteModal.err && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{deleteModal.err}</p>
          )}
          <p className="text-slate-700">
            Are you sure you want to delete agent <strong>{deleteModal.item?.username}</strong>? This action cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  );
}
