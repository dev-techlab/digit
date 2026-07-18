'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, Btn, Card, Field, fmtDateTime, Modal, Table, TextInput } from '../ui';

interface KioskRow {
  id: string;
  name: string;
  code: string;
  status: string;
  createdAt: string;
}

export function KioskScreen() {
  const [rows, setRows] = useState<KioskRow[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '' });
  const [err, setErr] = useState<string | null>(null);

  const load = () => api<{ kiosks: KioskRow[] }>('/api/agent/kiosks').then((d) => setRows(d.kiosks));
  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    setErr(null);
    try {
      await api('/api/agent/kiosks', { method: 'POST', body: JSON.stringify(form) });
      setOpen(false);
      setForm({ name: '', code: '' });
      void load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <Btn
          variant="success"
          className="mb-4"
          onClick={() => {
            setErr(null);
            setOpen(true);
          }}
        >
          <Plus size={16} /> Add Kiosk
        </Btn>
        <Table headers={['Name', 'Code', 'Status', 'Created']} empty={rows.length === 0}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-medium text-slate-700">{r.name}</td>
              <td className="px-4 py-3 font-mono">{r.code}</td>
              <td className="px-4 py-3 capitalize">{r.status}</td>
              <td className="px-4 py-3">{fmtDateTime(r.createdAt)}</td>
            </tr>
          ))}
        </Table>
      </Card>

      <Modal
        title="Add Kiosk"
        open={open}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={create} disabled={!form.name || !form.code}>
              Confirm
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{err}</p>}
          <Field label="Name" required>
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Code" required>
            <TextInput value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
