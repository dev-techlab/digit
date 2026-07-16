'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
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
} from '../ui';

interface MemberRow {
  id: string;
  username: string;
  phone: string | null;
  saleAgent: string | null;
  onlineSc: string;
  scRewardEnabled: boolean;
  remark: string | null;
  deposit: string;
  withdraw: string;
  totalNet: string;
  totalIn: string;
  totalOut: string;
}

interface MemberDetail {
  member: { username: string; remark: string | null };
  logins: { ipAddress: string | null; device: string | null; createdAt: string }[];
  bindings: { platform: string; gameUsername: string | null }[];
}

const randUser = () => String(Math.floor(1000000 + Math.random() * 9000000));
const randPass = () => String(Math.floor(100000 + Math.random() * 900000));

export function MemberScreen() {
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [phone, setPhone] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<MemberRow | null>(null);
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [remark, setRemark] = useState('');
  const [form, setForm] = useState({ username: randUser(), password: randPass(), remark: '' });
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(
    (p = page, q = search, ph = phone) =>
      api<{ members: MemberRow[]; total: number }>(
        `/api/agent/members?page=${p}&pageSize=10&search=${encodeURIComponent(q)}&phone=${encodeURIComponent(ph)}`
      ).then((d) => {
        setRows(d.members);
        setTotal(d.total);
      }),
    [page, search, phone]
  );
  useEffect(() => {
    void load(1, '', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    setErr(null);
    try {
      await api('/api/agent/members', { method: 'POST', body: JSON.stringify(form) });
      setAddOpen(false);
      setForm({ username: randUser(), password: randPass(), remark: '' });
      void load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const saveEdit = async () => {
    if (!editRow) return;
    await api('/api/agent/members', {
      method: 'PUT',
      body: JSON.stringify({ id: editRow.id, remark }),
    });
    setEditRow(null);
    void load();
  };

  const openDetail = async (row: MemberRow) => {
    setDetail(await api<MemberDetail>(`/api/agent/members/${row.id}`));
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-500">Search</span>
        <TextInput
          className="w-full sm:w-56"
          placeholder="Enter username"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-sm text-slate-500">Phone</span>
        <TextInput
          className="w-full sm:w-48"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
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
            setPhone('');
            setPage(1);
            void load(1, '', '');
          }}
        />
      </Card>

      <Card>
        <Btn variant="success" className="mb-4" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add Member
        </Btn>
        <Table
          headers={[
            'Username',
            'Phone',
            'Sale Agent',
            'Online SC',
            'Deposit',
            'Withdraw',
            'TotalNet',
            'TotalIn Score',
            'TotalOut Score',
            'Operations',
          ]}
          empty={rows.length === 0}
        >
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3">
                <span className="font-medium text-slate-700">{r.username}</span>
                {!r.scRewardEnabled && (
                  <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-500">
                    No SC Reward
                  </span>
                )}
              </td>
              <td className="px-4 py-3">{r.phone ?? ''}</td>
              <td className="px-4 py-3">{r.saleAgent ?? '-'}</td>
              <td className="px-4 py-3 font-semibold text-green-600">{fmtMoney(r.onlineSc)}</td>
              <td className="px-4 py-3">{fmtMoney(r.deposit)}</td>
              <td className="px-4 py-3">{fmtMoney(r.withdraw)}</td>
              <td className="px-4 py-3 font-semibold text-green-600">{fmtMoney(r.totalNet)}</td>
              <td className="px-4 py-3">{Number(r.totalIn).toFixed(2)}</td>
              <td className="px-4 py-3">{Number(r.totalOut).toFixed(2)}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2 whitespace-nowrap">
                  <button
                    className="text-blue-500 hover:underline"
                    onClick={() => void openDetail(r)}
                  >
                    Game Platform Binding
                  </button>
                  <button
                    className="text-slate-500 hover:underline"
                    onClick={() => {
                      setEditRow(r);
                      setRemark(r.remark ?? '');
                    }}
                  >
                    More ▾
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
        <Pagination total={total} page={page} pageSize={10} onPage={(p) => { setPage(p); void load(p); }} />
      </Card>

      <Modal
        title="Add Member"
        open={addOpen}
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <Btn onClick={create}>Create</Btn>
            <Btn variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
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
              />
            </Field>
            <Field label="Password" required>
              <TextInput
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Remark">
            <TextInput
              placeholder="Enter remark..."
              value={form.remark}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        title={editRow ? `Edit Member[${editRow.username}]` : ''}
        open={!!editRow}
        onClose={() => setEditRow(null)}
        footer={
          <>
            <Btn onClick={saveEdit}>Save</Btn>
            <Btn variant="ghost" onClick={() => setEditRow(null)}>
              Cancel
            </Btn>
          </>
        }
      >
        <Field label="Remark">
          <TextInput
            placeholder="Enter remark..."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </Field>
      </Modal>

      <Modal
        title={detail ? `Member ${detail.member.username}` : ''}
        open={!!detail}
        onClose={() => setDetail(null)}
        wide
      >
        {detail && (
          <div className="space-y-6">
            <div>
              <h4 className="mb-2 font-semibold text-slate-700">Game Platform Bindings</h4>
              <Table headers={['Platform', 'Game Username']} empty={detail.bindings.length === 0}>
                {detail.bindings.map((b, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">{b.platform}</td>
                    <td className="px-4 py-3">{b.gameUsername ?? '-'}</td>
                  </tr>
                ))}
              </Table>
            </div>
            <div>
              <h4 className="mb-2 font-semibold text-slate-700">Login History</h4>
              <Table headers={['Time', 'IP', 'Device']} empty={detail.logins.length === 0}>
                {detail.logins.map((l, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">{fmtDateTime(l.createdAt)}</td>
                    <td className="px-4 py-3">{l.ipAddress ?? '-'}</td>
                    <td className="px-4 py-3">{l.device ?? '-'}</td>
                  </tr>
                ))}
              </Table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
