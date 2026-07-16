'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, ClipboardList, Info } from 'lucide-react';
import {
  api,
  Btn,
  Card,
  Drawer,
  Field,
  fmtMoney,
  Modal,
  ResetBtn,
  SearchBtn,
  Select,
  Table,
  TextInput,
} from '../ui';

interface AgentRow {
  id: string;
  username: string;
  nickname: string | null;
  email: string | null;
  ratioPct: string;
  onlineBalance: string;
  inviteCode: string;
  status: string;
  remark: string | null;
}

interface ReportRow {
  agentId: string;
  username: string;
  deposit: string;
  depositors: number;
  withdrawal: string;
  withdrawers: number;
  totalIn: string;
  totalOut: string;
  bonus: string;
  gameDepositFee: string;
  platformFee: string;
}

export function AgentListScreen({ type }: { type: 'sale' | 'sub' }) {
  const [rows, setRows] = useState<AgentRow[]>([]);
  const [search, setSearch] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState<ReportRow[]>([]);
  const [form, setForm] = useState({
    username: `p${Math.floor(10000 + Math.random() * 90000)}`,
    password: '',
    nickname: '',
    ratioPct: '0.00',
    remark: '',
  });
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(
    (q = search) =>
      api<{ agents: AgentRow[] }>(
        `/api/agent/agents?type=${type}&search=${encodeURIComponent(q)}`
      ).then((d) => setRows(d.agents)),
    [type, search]
  );
  useEffect(() => {
    void load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const openReport = async () => {
    const d = await api<{ report: ReportRow[] }>(`/api/agent/agents?type=${type}&report=1`);
    setReport(d.report);
    setReportOpen(true);
  };

  const create = async () => {
    setErr(null);
    try {
      await api('/api/agent/agents', { method: 'POST', body: JSON.stringify({ ...form, type }) });
      setAddOpen(false);
      setForm({ ...form, username: `p${Math.floor(10000 + Math.random() * 90000)}`, password: '', nickname: '', remark: '' });
      void load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const label = type === 'sale' ? 'Sale Agent' : 'Sub Agent';

  const filtered = rows.filter(
    (r) =>
      (status === 'all' || r.status === status) &&
      (!code || r.inviteCode.toLowerCase().includes(code.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-500">Search</span>
        <TextInput
          className="w-full sm:w-64"
          placeholder="Username/Nickname/Email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-sm text-slate-500">Code</span>
        <TextInput
          className="w-full sm:w-40"
          placeholder="Enter code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <span className="text-sm text-slate-500">Status</span>
        <Select className="w-full sm:w-32" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </Select>
        <SearchBtn onClick={() => void load()} />
        <ResetBtn
          onClick={() => {
            setSearch('');
            setCode('');
            setStatus('all');
            void load('');
          }}
        />
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Btn variant="success" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add
          </Btn>
          <Btn onClick={openReport}>
            <ClipboardList size={16} /> Total Report
          </Btn>
          {type === 'sale' && (
            <span className="flex items-center gap-1.5 text-sm text-slate-500">
              <Info size={14} /> Only direct sale agents&apos; commission can be edited
            </span>
          )}
        </div>
        <Table
          headers={['Username', 'Ratio', 'Balance', 'Nickname', 'Email', 'Invite Link', 'Status', 'Remark']}
          empty={filtered.length === 0}
        >
          {filtered.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-medium text-slate-700">{r.username}</td>
              <td className="px-4 py-3">{Number(r.ratioPct).toFixed(2)}%</td>
              <td className="px-4 py-3">{fmtMoney(r.onlineBalance)}</td>
              <td className="px-4 py-3">{r.nickname ?? '-'}</td>
              <td className="px-4 py-3">{r.email ?? '-'}</td>
              <td className="max-w-56 truncate px-4 py-3 text-blue-500">
                https://digitlink.mobi?inviteCode={r.inviteCode}
              </td>
              <td className="px-4 py-3 capitalize">{r.status}</td>
              <td className="px-4 py-3">{r.remark ?? '-'}</td>
            </tr>
          ))}
        </Table>
      </Card>

      <Drawer
        title="Add User"
        open={addOpen}
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <Btn onClick={create} disabled={!form.username || !form.password || !form.nickname}>
              Confirm
            </Btn>
            <Btn variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{err}</p>}
          <Field label="Username" required>
            <TextInput
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </Field>
          <Field label="Password" required>
            <TextInput
              type="password"
              placeholder="Please enter password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Field label="Nickname" required>
            <TextInput
              placeholder="Please enter nickname"
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
            />
          </Field>
          <Field label="Ratio" hint="%">
            <TextInput
              type="number"
              value={form.ratioPct}
              onChange={(e) => setForm({ ...form, ratioPct: e.target.value })}
            />
          </Field>
          <Field label="Remark" hint={`${form.remark.length} / 300`}>
            <TextInput
              placeholder="Enter remark(optional)"
              maxLength={300}
              value={form.remark}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
            />
          </Field>
        </div>
      </Drawer>

      <Modal
        title={`Report - All ${label}s`}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        wide
      >
        <Table
          headers={[
            label,
            'Deposit',
            'Depositors',
            'Withdrawal',
            'Withdrawers',
            'TotalIn Score',
            'TotalOut Score',
            'Gross Net Score',
            'Total Bonus Score',
            'Game Deposit Fee',
            'Platform Fee',
          ]}
          empty={report.length === 0}
        >
          {report.map((r) => (
            <tr key={r.agentId}>
              <td className="px-4 py-3 font-medium">{r.username}</td>
              <td className="px-4 py-3">{fmtMoney(r.deposit)}</td>
              <td className="px-4 py-3">{r.depositors}</td>
              <td className="px-4 py-3">{fmtMoney(r.withdrawal)}</td>
              <td className="px-4 py-3">{r.withdrawers}</td>
              <td className="px-4 py-3">{fmtMoney(r.totalIn)}</td>
              <td className="px-4 py-3">{fmtMoney(r.totalOut)}</td>
              <td className="px-4 py-3">{fmtMoney(Number(r.totalIn) - Number(r.totalOut))}</td>
              <td className="px-4 py-3">{fmtMoney(r.bonus)}</td>
              <td className="px-4 py-3">{fmtMoney(r.gameDepositFee)}</td>
              <td className="px-4 py-3">{fmtMoney(r.platformFee)}</td>
            </tr>
          ))}
        </Table>
      </Modal>
    </div>
  );
}
