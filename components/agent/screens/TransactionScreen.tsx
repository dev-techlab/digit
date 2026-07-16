'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  api,
  Btn,
  Card,
  fmtDateTime,
  fmtMoney,
  Modal,
  ResetBtn,
  SearchBtn,
  Select,
  Table,
  TextInput,
} from '../ui';

interface TxRow {
  id: string;
  username: string | null;
  game: string | null;
  type: string;
  channel: string;
  amount: string;
  onlineScChange: string;
  storeBalanceVary: string;
  status: string;
  createdAt: string;
}
interface Summary {
  storeBalanceVary: string;
  totalIn: string;
  totalOut: string;
  bonus: string;
  gameDepositFee: string;
  platformFee: string;
  total: number;
}
interface AuditRow {
  id: string;
  player: string | null;
  platform: string | null;
  amount: string;
  status: string;
  submittedAt: string;
}
interface ReportData {
  daily: Record<string, string>[];
  byGame: Record<string, string>[];
}

export function TransactionScreen() {
  const [tab, setTab] = useState<'list' | 'audit'>('list');
  const [rows, setRows] = useState<TxRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [auditStatus, setAuditStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [report, setReport] = useState<ReportData | null>(null);

  const load = useCallback(
    () =>
      api<{ transactions: TxRow[]; summary: Summary }>(
        `/api/agent/transactions?search=${encodeURIComponent(search)}&type=${type}`
      ).then((d) => {
        setRows(d.transactions);
        setSummary(d.summary);
      }),
    [search, type]
  );
  const loadAudits = useCallback(
    (st = auditStatus) =>
      api<{ audits: AuditRow[] }>(`/api/agent/redemption-audits?status=${st}`).then((d) =>
        setAudits(d.audits)
      ),
    [auditStatus]
  );

  useEffect(() => {
    void load();
    void loadAudits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openReport = async () => {
    setReport(await api<ReportData>('/api/agent/transactions?report=1'));
  };

  const review = async (id: string, decision: 'approved' | 'rejected') => {
    await api('/api/agent/redemption-audits', {
      method: 'PUT',
      body: JSON.stringify({ id, decision }),
    });
    void loadAudits();
  };

  const summaryCells: [string, string][] = summary
    ? [
        ['Store Balance Vary', fmtMoney(summary.storeBalanceVary)],
        ['TotalIn Score', fmtMoney(summary.totalIn)],
        ['TotalOut Score', fmtMoney(summary.totalOut)],
        ['Gross Net Score', fmtMoney(Number(summary.totalIn) - Number(summary.totalOut))],
        ['Total Bonus Score', fmtMoney(summary.bonus)],
        ['Game Deposit Fee', fmtMoney(summary.gameDepositFee)],
        ['Platform Fee', fmtMoney(summary.platformFee)],
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex gap-6 text-base font-semibold">
        <button
          onClick={() => setTab('list')}
          className={tab === 'list' ? 'border-b-2 border-blue-500 pb-1.5 text-blue-500' : 'pb-1.5 text-slate-700'}
        >
          Transaction List
        </button>
        <button
          onClick={() => setTab('audit')}
          className={tab === 'audit' ? 'border-b-2 border-blue-500 pb-1.5 text-blue-500' : 'pb-1.5 text-slate-700'}
        >
          Redemption Audit
        </button>
      </div>

      {tab === 'list' ? (
        <>
          <Card className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-500">Search</span>
            <TextInput
              className="w-full sm:w-64"
              placeholder="Member Username/Game PlayerId"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="text-sm text-slate-500">Transaction Type</span>
            <Select className="w-full sm:w-36" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All</option>
              <option value="recharge">Recharge</option>
              <option value="redeem">Redeem</option>
              <option value="bonus">Bonus</option>
              <option value="transfer">Transfer</option>
            </Select>
            <SearchBtn onClick={() => void load()} />
            <ResetBtn
              onClick={() => {
                setSearch('');
                setType('');
                void load();
              }}
            />
          </Card>

          {summary && (
            <Card className="p-0">
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-slate-100 sm:grid-cols-4 xl:grid-cols-8">
                {summaryCells.map(([label, value]) => (
                  <div key={label} className="bg-white px-3 py-4 text-center sm:px-5">
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="mt-1 font-semibold text-slate-700">{value}</p>
                  </div>
                ))}
                <div className="flex items-center justify-center bg-white px-3 py-4">
                  <Btn onClick={openReport}>
                    <BarChart3 size={15} /> Report
                  </Btn>
                </div>
              </div>
            </Card>
          )}

          <Card>
            <Table
              headers={[
                'User Detail',
                'Create Time',
                'Amount',
                'Online SC Changes',
                'Store Balance Vary',
                'Game & Product',
                'Type',
                'Status',
              ]}
              empty={rows.length === 0}
            >
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-slate-700">{r.username ?? '-'}</td>
                  <td className="px-4 py-3">{fmtDateTime(r.createdAt)}</td>
                  <td className="px-4 py-3">{fmtMoney(r.amount)}</td>
                  <td className="px-4 py-3">{fmtMoney(r.onlineScChange)}</td>
                  <td className="px-4 py-3">{fmtMoney(r.storeBalanceVary)}</td>
                  <td className="px-4 py-3">{r.game ?? '-'}</td>
                  <td className="px-4 py-3 capitalize">
                    {r.type} · {r.channel}
                  </td>
                  <td className="px-4 py-3 capitalize">{r.status}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      ) : (
        <>
          <Card className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-500">Status</span>
            <Select
              className="w-full sm:w-44"
              value={auditStatus}
              onChange={(e) => {
                setAuditStatus(e.target.value);
                void loadAudits(e.target.value);
              }}
            >
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </Select>
            <SearchBtn onClick={() => void loadAudits()} />
            <ResetBtn onClick={() => void loadAudits('pending')} />
          </Card>
          <Card>
            <Table
              headers={['Store Name', 'Submit Time', 'Player', 'Game Platform', 'Amount', 'Operations']}
              empty={audits.length === 0}
            >
              {audits.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">—</td>
                  <td className="px-4 py-3">{fmtDateTime(a.submittedAt)}</td>
                  <td className="px-4 py-3 font-medium">{a.player ?? '-'}</td>
                  <td className="px-4 py-3">{a.platform ?? '-'}</td>
                  <td className="px-4 py-3">{fmtMoney(a.amount)}</td>
                  <td className="px-4 py-3">
                    {a.status === 'pending' ? (
                      <div className="flex gap-3">
                        <button
                          className="text-green-600 hover:underline"
                          onClick={() => void review(a.id, 'approved')}
                        >
                          Approve
                        </button>
                        <button
                          className="text-red-500 hover:underline"
                          onClick={() => void review(a.id, 'rejected')}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="capitalize text-slate-400">{a.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      <Modal title="Report" open={!!report} onClose={() => setReport(null)} wide>
        {report && (
          <div className="space-y-6">
            <div>
              <h4 className="mb-2 font-semibold text-slate-700">Daily Breakdown</h4>
              <Table
                headers={['Date', 'Store Balance Vary', 'TotalIn', 'TotalOut', 'Gross Net', 'Bonus', 'Game Deposit Fee', 'Platform Fee', 'TotalNet']}
                empty={report.daily.length === 0}
              >
                {report.daily.map((d) => (
                  <tr key={d.date}>
                    <td className="px-4 py-3">{d.date}</td>
                    <td className="px-4 py-3">{fmtMoney(d.storeBalanceVary)}</td>
                    <td className="px-4 py-3">{fmtMoney(d.totalIn)}</td>
                    <td className="px-4 py-3">{fmtMoney(d.totalOut)}</td>
                    <td className="px-4 py-3">{fmtMoney(Number(d.totalIn) - Number(d.totalOut))}</td>
                    <td className="px-4 py-3">{fmtMoney(d.bonus)}</td>
                    <td className="px-4 py-3">{fmtMoney(d.gameDepositFee)}</td>
                    <td className="px-4 py-3">{fmtMoney(d.platformFee)}</td>
                    <td className="px-4 py-3 font-semibold">
                      {fmtMoney(Number(d.totalIn) - Number(d.totalOut) - Number(d.platformFee))}
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
            <div>
              <h4 className="mb-2 font-semibold text-slate-700">Game Breakdown</h4>
              <Table
                headers={['Game', 'Store Balance Vary', 'TotalIn', 'TotalOut', 'Gross Net', 'Bonus', 'Game Deposit Fee', 'Platform Fee']}
                empty={report.byGame.length === 0}
              >
                {report.byGame.map((g) => (
                  <tr key={g.game}>
                    <td className="px-4 py-3">{g.game}</td>
                    <td className="px-4 py-3">{fmtMoney(g.storeBalanceVary)}</td>
                    <td className="px-4 py-3">{fmtMoney(g.totalIn)}</td>
                    <td className="px-4 py-3">{fmtMoney(g.totalOut)}</td>
                    <td className="px-4 py-3">{fmtMoney(Number(g.totalIn) - Number(g.totalOut))}</td>
                    <td className="px-4 py-3">{fmtMoney(g.bonus)}</td>
                    <td className="px-4 py-3">{fmtMoney(g.gameDepositFee)}</td>
                    <td className="px-4 py-3">{fmtMoney(g.platformFee)}</td>
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
