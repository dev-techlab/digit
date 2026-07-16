'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, Btn, Card, Field, fmtDateTime, Modal, Table, TextInput } from '../ui';

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
  const [form, setForm] = useState({ username: '', password: '', nickname: '', email: '', status: 'active' });
  const [err, setErr] = useState<string | null>(null);

  const load = () => api<{ admins: AdminRow[] }>('/api/agent/store-admins').then((d) => setRows(d.admins));
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
        <Table
          headers={['Username', 'Nickname', 'Email', 'Status', 'Created', 'Operations']}
          empty={rows.length === 0}
        >
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-medium text-slate-700">{r.username}</td>
              <td className="px-4 py-3">{r.nickname ?? '-'}</td>
              <td className="px-4 py-3">{r.email ?? '-'}</td>
              <td className="px-4 py-3 capitalize">{r.status}</td>
              <td className="px-4 py-3">{fmtDateTime(r.createdAt)}</td>
              <td className="px-4 py-3">
                <button className="text-blue-500 hover:underline" onClick={() => void toggleStatus(r)}>
                  {r.status === 'active' ? 'Disable' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </Table>
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
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{err}</p>}
          <Field label="Username" required>
            <TextInput value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </Field>
          <Field label="Password" required>
            <TextInput
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Field label="Nickname">
            <TextInput value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
          </Field>
          <Field label="Email">
            <TextInput value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
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
        </div>
      </Modal>
    </div>
  );
}
