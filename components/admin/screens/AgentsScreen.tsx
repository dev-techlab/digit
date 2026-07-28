'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, Edit, Plus } from 'lucide-react';
import {
  api,
  Btn,
  Card,
  Field,
  fmtDateTime,
  fmtMoney,
  Modal,
  Pagination,
  ResetBtn,
  SearchBtn,
  Table,
  TextInput,
} from '@/components/agent/ui';

interface AgentRow {
  id: string;
  username: string;
  nickname: string | null;
  email: string | null;
  inviteCode: string;
  discountPer: string;
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

interface GameAssignment {
  platformId: string;
  availableFromTime?: string;
  availableToTime?: string;
}

const emptyForm = () => ({ username: '', password: '', nickname: '', email: '', discountPer: '0.00', remark: '' });

/** Top-level store/agent accounts — the B2B side that resells game credits to members. */
export function AgentsScreen() {
  const [rows, setRows] = useState<AgentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ username: string; password: string } | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<AgentRow | null>(null);
  const [editForm, setEditForm] = useState({ nickname: '', email: '', discountPer: '0', remark: '' });
  const [editBusy, setEditBusy] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<PlatformOption[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<GameAssignment[]>([]);
  const [gameSearch, setGameSearch] = useState('');

  const load = useCallback(
    (p = page, q = search) =>
      api<{ agents: AgentRow[]; total: number }>(
        `/api/admin/agents?page=${p}&pageSize=20&search=${encodeURIComponent(q)}`
      )
        .then((d) => {
          setRows(d.agents);
          setTotal(d.total);
        })
        .finally(() => setLoading(false)),
    [page, search]
  );
  useEffect(() => {
    void load(1, '');
  }, []);

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
      setSelectedPlatforms(
        data.platforms
          .filter((p) => p.assigned)
          .map((p) => ({
            platformId: p.id,
            availableFromTime: p.availableFromTime || undefined,
            availableToTime: p.availableToTime || undefined,
          }))
      );
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
    setErr(null);
    if (!form.username.trim() || !form.password) {
      setErr('Username and password are required.');
      return;
    }
    setSaving(true);
    try {
      const agentData = await api<{ agent: { id: string; username: string; password: string } }>('/api/admin/agents', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      if (selectedPlatforms.length > 0) {
        await api('/api/admin/agent-platforms', {
          method: 'PUT',
          body: JSON.stringify({ agentId: agentData.agent.id, assignments: selectedPlatforms }),
        });
      }

      setCreated({ username: agentData.agent.username, password: agentData.agent.password });
      setForm(emptyForm());
      setSelectedPlatforms([]);
      setGameSearch('');
      void load(1, '');
      setPage(1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create agent.');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editRow) return;
    setEditErr(null);
    setEditBusy(true);
    try {
      await api('/api/admin/agents', {
        method: 'PUT',
        body: JSON.stringify({
          id: editRow.id,
          nickname: editForm.nickname,
          email: editForm.email,
          discountPer: editForm.discountPer,
          remark: editForm.remark,
        }),
      });
      await api('/api/admin/agent-platforms', {
        method: 'PUT',
        body: JSON.stringify({ agentId: editRow.id, assignments: selectedPlatforms }),
      });
      void load(page, search);
      setEditOpen(false);
    } catch (e) {
      setEditErr(e instanceof Error ? e.message : 'Failed to update agent.');
    } finally {
      setEditBusy(false);
    }
  };

  const toggleStatus = async (row: AgentRow) => {
    const next = row.status === 'active' ? 'disabled' : 'active';
    setBusyId(row.id);
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
    try {
      await api('/api/admin/agents', { method: 'PUT', body: JSON.stringify({ id: row.id, status: next }) });
    } catch (e) {
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: row.status } : r)));
      window.alert(e instanceof Error ? e.message : 'Failed to update status.');
    } finally {
      setBusyId(null);
    }
  };

  const renderGameSelector = (label = 'Platforms') => {
    const filtered = platforms.filter((p) => p.name.toLowerCase().includes(gameSearch.toLowerCase()));

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
                const selected = selectedPlatforms.find((g) => g.platformId === platform.id);
                const checked = !!selected;
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
                            if (current.find((g) => g.platformId === platform.id)) {
                              return current.filter((g) => g.platformId !== platform.id);
                            }
                            return [...current, { platformId: platform.id }];
                          });
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="flex-1 font-medium">{platform.name}</span>
                    </label>
                    {checked && (
                      <div className="flex gap-3 px-3 pb-3">
                        <div className="flex-1">
                          <span className="mb-1 block text-xs font-medium text-slate-500">Available from</span>
                          <input
                            type="time"
                            value={selected.availableFromTime || ''}
                            onChange={(e) => {
                              setSelectedPlatforms((current) =>
                                current.map((g) =>
                                  g.platformId === platform.id ? { ...g, availableFromTime: e.target.value } : g
                                )
                              );
                            }}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-400"
                          />
                        </div>
                        <div className="flex-1">
                          <span className="mb-1 block text-xs font-medium text-slate-500">Available to</span>
                          <input
                            type="time"
                            value={selected.availableToTime || ''}
                            onChange={(e) => {
                              setSelectedPlatforms((current) =>
                                current.map((g) =>
                                  g.platformId === platform.id ? { ...g, availableToTime: e.target.value } : g
                                )
                              );
                            }}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-400"
                          />
                        </div>
                      </div>
                    )}
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
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-500">Search</span>
        <TextInput
          className="w-full sm:w-64"
          placeholder="Username, nickname or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SearchBtn
          onClick={() => {
            setPage(1);
            void load(1);
          }}
        />
        <ResetBtn
          onClick={() => {
            setSearch('');
            setPage(1);
            void load(1, '');
          }}
        />
      </Card>

      <Card>
        <Btn
          variant="success"
          className="mb-4"
          onClick={async () => {
            setErr(null);
            setForm(emptyForm());
            setSelectedPlatforms([]);
            setGameSearch('');
            await loadPlatforms();
            setOpen(true);
          }}
        >
          <Plus size={16} /> Add Agent
        </Btn>
        <Table
          headers={[
            'Username',
            'Nickname',
            'Email',
            'Discount',
            'Online Balance',
            'Invite Code',
            'Last Login',
            'Created',
            'Status',
            'Operations',
          ]}
          empty={!loading && rows.length === 0}
        >
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-medium text-slate-700">{r.username}</td>
              <td className="px-4 py-3">{r.nickname ?? '-'}</td>
              <td className="px-4 py-3">{r.email ?? '-'}</td>
              <td className="px-4 py-3">{r.discountPer ?? '-'}</td>
              <td className="px-4 py-3 font-semibold text-green-600">{fmtMoney(r.onlineBalance)}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.inviteCode}</td>
              <td className="px-4 py-3">{fmtDateTime(r.lastLoginAt)}</td>
              <td className="px-4 py-3">{fmtDateTime(r.createdAt)}</td>
              <td className="px-4 py-3">
                <span
                  className={
                    r.status === 'active'
                      ? 'rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-600'
                      : 'rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-500'
                  }
                >
                  {r.status === 'active' ? 'Active' : 'Disabled'}
                </span>
              </td>
              <td className="px-4 py-3">
                <Btn
                  variant="ghost"
                  className="px-1 text-xs mr-2"
                  disabled={editBusy && editRow?.id === r.id}
                  onClick={() => {
                    setEditRow(r);
                    setEditForm({
                      nickname: r.nickname ?? '',
                      email: r.email ?? '',
                      discountPer: r.discountPer,
                      remark: r.remark ?? '',
                    });
                    setEditErr(null);
                    void loadPlatforms(r.id);
                    setEditOpen(true);
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
              </td>
            </tr>
          ))}
        </Table>
        <Pagination
          total={total}
          page={page}
          pageSize={20}
          onPage={(p) => {
            setPage(p);
            void load(p);
          }}
        />
      </Card>

      <Modal
        title="Add Agent"
        open={open}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={create} disabled={saving}>
              {saving ? 'Creating…' : 'Confirm'}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{err}</p>}
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
              <TextInput value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Discount" hint="%">
              <TextInput
                type="number"
                value={form.discountPer}
                onChange={(e) => setForm({ ...form, discountPer: e.target.value })}
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

      <Modal title="Edit Agent" open={editOpen} onClose={() => setEditOpen(false)} footer={
        <>
          <Btn variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Btn>
          <Btn onClick={saveEdit} disabled={editBusy}>{editBusy ? 'Saving…' : 'Save'}</Btn>
        </>
      }>
        <div className="space-y-4">
          {editErr && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{editErr}</p>}
          <div className="grid grid-cols-2 gap-4">
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
            <Field label="Discount" hint="%">
              <TextInput
                type="number"
                value={editForm.discountPer}
                onChange={(e) => setEditForm({ ...editForm, discountPer: e.target.value })}
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
    </div>
  );
}