'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { api, Btn, Card, fmtDateTime, fmtMoney, Modal, Select } from '../ui';
import { DataTable } from '@/components/ui/DataTable';

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
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<ReportData | null>(null);
  const PAGE_SIZE = 20;

  const load = useCallback(
    (p = page) =>
      api<{ transactions: TxRow[]; summary: Summary }>(
        `/api/agent/transactions?search=${encodeURIComponent(search)}&type=${type}&page=${p}&pageSize=${PAGE_SIZE}`
      ).then((d) => {
        setRows(d.transactions);
        setSummary(d.summary);
      }),
    [search, type, page]
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
          className={
            tab === 'list'
              ? 'border-b-2 border-blue-500 pb-1.5 text-blue-500'
              : 'pb-1.5 text-slate-700'
          }
        >
          Transaction List
        </button>
        <button
          onClick={() => setTab('audit')}
          className={
            tab === 'audit'
              ? 'border-b-2 border-blue-500 pb-1.5 text-blue-500'
              : 'pb-1.5 text-slate-700'
          }
        >
          Redemption Audit
        </button>
      </div>

      {tab === 'list' ? (
        <>
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
            <DataTable
              data={rows}
              rowKey={(r) => r.id}
              manualPagination
              totalRows={summary?.total ?? 0}
              currentPage={page}
              onPageChange={(p) => {
                setPage(p);
                void load(p);
              }}
              globalSearch={search}
              onSearchChange={setSearch}
              extraToolbar={
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Transaction Type:</span>
                  <Select
                    className="w-36 py-1.5"
                    value={type}
                    onChange={(e) => {
                      const val = e.target.value;
                      setType(val);
                      setPage(1);
                      api<{ transactions: TxRow[]; summary: Summary }>(
                        `/api/agent/transactions?search=${encodeURIComponent(search)}&type=${val}&page=1&pageSize=${PAGE_SIZE}`
                      ).then((d) => {
                        setRows(d.transactions);
                        setSummary(d.summary);
                      });
                    }}
                  >
                    <option value="">All</option>
                    <option value="recharge">Recharge</option>
                    <option value="redeem">Redeem</option>
                    <option value="bonus">Bonus</option>
                    <option value="transfer">Transfer</option>
                  </Select>
                </div>
              }
              columns={[
                {
                  header: 'User Detail',
                  accessorKey: 'username',
                  cell: (r) => (
                    <span className="font-medium text-slate-700">{r.username ?? '-'}</span>
                  ),
                },
                {
                  header: 'Create Time',
                  accessorKey: 'createdAt',
                  cell: (r) => fmtDateTime(r.createdAt),
                },
                { header: 'Amount', accessorKey: 'amount', cell: (r) => fmtMoney(r.amount) },
                {
                  header: 'Online SC Changes',
                  accessorKey: 'onlineScChange',
                  cell: (r) => fmtMoney(r.onlineScChange),
                },
                {
                  header: 'Store Balance Vary',
                  accessorKey: 'storeBalanceVary',
                  cell: (r) => fmtMoney(r.storeBalanceVary),
                },
                { header: 'Game & Product', accessorKey: 'game', cell: (r) => r.game ?? '-' },
                {
                  header: 'Type',
                  accessorKey: 'type',
                  cell: (r) => (
                    <span className="capitalize">
                      {r.type} · {r.channel}
                    </span>
                  ),
                },
                {
                  header: 'Status',
                  accessorKey: 'status',
                  cell: (r) => <span className="capitalize">{r.status}</span>,
                },
              ]}
            />
          </Card>
        </>
      ) : (
        <>
          <Card>
            <DataTable
              data={audits}
              rowKey={(r) => r.id}
              extraToolbar={
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Status:</span>
                  <Select
                    className="w-44 py-1.5"
                    value={auditStatus}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAuditStatus(val);
                      void loadAudits(val);
                    }}
                  >
                    <option value="pending">Pending Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </Select>
                </div>
              }
              columns={[
                { header: 'Store Name', accessorKey: 'id', cell: (r) => '—' },
                {
                  header: 'Submit Time',
                  accessorKey: 'submittedAt',
                  cell: (r) => fmtDateTime(r.submittedAt),
                },
                {
                  header: 'Player',
                  accessorKey: 'player',
                  cell: (r) => <span className="font-medium">{r.player ?? '-'}</span>,
                },
                {
                  header: 'Game Platform',
                  accessorKey: 'platform',
                  cell: (r) => r.platform ?? '-',
                },
                { header: 'Amount', accessorKey: 'amount', cell: (r) => fmtMoney(r.amount) },
                {
                  header: 'Operations',
                  enableSorting: false,
                  enableGlobalFilter: false,
                  cell: (r) =>
                    r.status === 'pending' ? (
                      <div className="flex gap-3">
                        <button
                          className="text-green-600 hover:underline"
                          onClick={() => void review(r.id, 'approved')}
                        >
                          Approve
                        </button>
                        <button
                          className="text-red-500 hover:underline"
                          onClick={() => void review(r.id, 'rejected')}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="capitalize text-slate-400">{r.status}</span>
                    ),
                },
              ]}
            />
          </Card>
        </>
      )}

      <Modal title="Report" open={!!report} onClose={() => setReport(null)} wide>
        {report && (
          <div className="space-y-6">
            <div>
              <h4 className="mb-2 font-semibold text-slate-700">Daily Breakdown</h4>
              <DataTable
                data={report.daily}
                rowKey={(r) => r.date}
                columns={[
                  { header: 'Date', accessorKey: 'date' },
                  {
                    header: 'Store Balance Vary',
                    accessorKey: 'storeBalanceVary',
                    cell: (r) => fmtMoney(r.storeBalanceVary),
                  },
                  { header: 'TotalIn', accessorKey: 'totalIn', cell: (r) => fmtMoney(r.totalIn) },
                  {
                    header: 'TotalOut',
                    accessorKey: 'totalOut',
                    cell: (r) => fmtMoney(r.totalOut),
                  },
                  {
                    header: 'Gross Net',
                    accessorKey: 'grossNet',
                    cell: (r) => fmtMoney(Number(r.totalIn) - Number(r.totalOut)),
                  },
                  { header: 'Bonus', accessorKey: 'bonus', cell: (r) => fmtMoney(r.bonus) },
                  {
                    header: 'Game Deposit Fee',
                    accessorKey: 'gameDepositFee',
                    cell: (r) => fmtMoney(r.gameDepositFee),
                  },
                  {
                    header: 'Platform Fee',
                    accessorKey: 'platformFee',
                    cell: (r) => fmtMoney(r.platformFee),
                  },
                  {
                    header: 'TotalNet',
                    accessorKey: 'totalNet',
                    cell: (r) => (
                      <span className="font-semibold">
                        {fmtMoney(Number(r.totalIn) - Number(r.totalOut) - Number(r.platformFee))}
                      </span>
                    ),
                  },
                ]}
              />
            </div>
            <div>
              <h4 className="mb-2 font-semibold text-slate-700">Game Breakdown</h4>
              <DataTable
                data={report.byGame}
                rowKey={(r) => r.game}
                columns={[
                  { header: 'Game', accessorKey: 'game' },
                  {
                    header: 'Store Balance Vary',
                    accessorKey: 'storeBalanceVary',
                    cell: (r) => fmtMoney(r.storeBalanceVary),
                  },
                  { header: 'TotalIn', accessorKey: 'totalIn', cell: (r) => fmtMoney(r.totalIn) },
                  {
                    header: 'TotalOut',
                    accessorKey: 'totalOut',
                    cell: (r) => fmtMoney(r.totalOut),
                  },
                  {
                    header: 'Gross Net',
                    accessorKey: 'grossNet',
                    cell: (r) => fmtMoney(Number(r.totalIn) - Number(r.totalOut)),
                  },
                  { header: 'Bonus', accessorKey: 'bonus', cell: (r) => fmtMoney(r.bonus) },
                  {
                    header: 'Game Deposit Fee',
                    accessorKey: 'gameDepositFee',
                    cell: (r) => fmtMoney(r.gameDepositFee),
                  },
                  {
                    header: 'Platform Fee',
                    accessorKey: 'platformFee',
                    cell: (r) => fmtMoney(r.platformFee),
                  },
                ]}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
