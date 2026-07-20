'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, Plus } from 'lucide-react';
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
  onlineBalance: string;
  status: 'active' | 'disabled';
  remark: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

const emptyForm = () => ({ username: '', password: '', nickname: '', email: '', remark: '' });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    setErr(null);
    if (!form.username.trim() || !form.password) {
      setErr('Username and password are required.');
      return;
    }
    setSaving(true);
    try {
      const data = await api<{ agent: { username: string; password: string } }>('/api/admin/agents', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setCreated(data.agent);
      setForm(emptyForm());
      void load(1, '');
      setPage(1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create agent.');
    } finally {
      setSaving(false);
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
          onClick={() => {
            setErr(null);
            setForm(emptyForm());
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
          </div>
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
    </div>
  );
}
