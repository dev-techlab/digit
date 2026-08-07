'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, Btn, Card, Field, fmtDateTime, Modal, TextInput } from '../ui';
import { DataTable } from '@/components/ui/DataTable';

interface AdminRow {
  id: string;
  username: string;
  nickname: string | null;
  email: string | null;
  status: string;
  createdAt: string;
}

export function StoreAdminScreen() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    nickname: '',
    email: '',
    status: 'active',
  });
  const [err, setErr] = useState<string | null>(null);

  const load = () =>
    api<{ admins: AdminRow[] }>('/api/agent/store-admins').then((d) => setRows(d.admins));
  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    setErr(null);
    try {
      await api('/api/agent/store-admins', { method: 'POST', body: JSON.stringify(form) });
      setOpen(false);
      setForm({ username: '', password: '', nickname: '', email: '', status: 'active' });
      void load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const toggleStatus = async (r: AdminRow) => {
    await api('/api/agent/store-admins', {
      method: 'PUT',
      body: JSON.stringify({ id: r.id, status: r.status === 'active' ? 'disabled' : 'active' }),
    });
    void load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <Btn variant="success" className="mb-4" onClick={() => setOpen(true)}>
          <Plus size={16} /> Add store administrator
        </Btn>
        <DataTable
          data={rows}
          rowKey={(r) => r.id}
          manualPagination={false}
          columns={[
            {
              header: 'Username',
              accessorKey: 'username',
              cell: (r) => <span className="font-medium text-slate-700">{r.username}</span>,
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
              header: 'Status',
              accessorKey: 'status',
              cell: (r) => <span className="capitalize">{r.status}</span>,
            },
            {
              header: 'Created',
              accessorKey: 'createdAt',
              cell: (r) => fmtDateTime(r.createdAt),
            },
            {
              header: 'Operations',
              enableSorting: false,
              cell: (r) => (
                <button
                  className="text-blue-500 hover:underline"
                  onClick={() => void toggleStatus(r)}
                >
                  {r.status === 'active' ? 'Disable' : 'Activate'}
                </button>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="Add store administrator"
        open={open}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={create} disabled={!form.username || !form.password}>
              Confirm
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Username" required>
            <TextInput
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </Field>
          <Field label="Password" required>
            <TextInput
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
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
          <Field label="Status">
            <div className="flex gap-5 text-sm text-slate-600">
              {(['active', 'disabled'] as const).map((st) => (
                <label key={st} className="flex items-center gap-2 capitalize">
                  <input
                    type="radio"
                    checked={form.status === st}
                    onChange={() => setForm({ ...form, status: st })}
                  />
                  {st === 'active' ? 'Active' : 'Disabled'}
                </label>
              ))}
            </div>
          </Field>
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{err}</p>}
        </div>
      </Modal>
    </div>
  );
}
