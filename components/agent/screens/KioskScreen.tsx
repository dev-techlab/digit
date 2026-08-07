'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, Btn, Card, Field, fmtDateTime, Modal, TextInput } from '../ui';
import { DataTable } from '@/components/ui/DataTable';

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

  const load = () =>
    api<{ kiosks: KioskRow[] }>('/api/agent/kiosks').then((d) => setRows(d.kiosks));
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
        <DataTable
          data={rows}
          rowKey={(r) => r.id}
          manualPagination={false}
          columns={[
            {
              header: 'Name',
              accessorKey: 'name',
              cell: (r) => <span className="font-medium text-slate-700">{r.name}</span>,
            },
            {
              header: 'Code',
              accessorKey: 'code',
              cell: (r) => <span className="font-mono">{r.code}</span>,
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
          ]}
        />
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
          <Field label="Name" required>
            <TextInput
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Code" required>
            <TextInput
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </Field>
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{err}</p>}
        </div>
      </Modal>
    </div>
  );
}
