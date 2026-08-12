'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
import { api, Btn, Card, fmtDateTime, fmtMoney, Modal } from '../../ui';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from '@/lib/cn';
import { LogRow, WalletData } from './types';

const LOG_TABS = [
  'Report',
  'Agent Deposit Log',
  'Agent Withdraw Log',
  'Agent Transfer Log',
  'Agent Transfer Request Log',
] as const;

const orderNo = (id: string) => id.replace(/-/g, '').slice(0, 16).toUpperCase();

const DEPOSIT_METHODS = [
  { key: 'paypal_pyusd', label: 'Paypal PYUSD' },
  { key: 'cashapp_usdc', label: 'Cashapp USDC' },
  { key: 'bitcoin', label: 'Bitcoin' },
  { key: 'bitcoin_lightning', label: 'Bitcoin Lightning Network' },
];
const WITHDRAW_METHODS = [
  { key: 'paypal_pyusd', label: 'Paypal PYUSD', fee: 'FEE UP TO $2' },
  { key: 'cashapp_usdc', label: 'Cashapp USDC', fee: 'FEE UP TO $2' },
  { key: 'bitcoin', label: 'Bitcoin' },
  { key: 'bank_card', label: 'Bank Card' },
  { key: 'ach', label: 'ACH Bank Transfer' },
];

const METHOD_LABEL: Record<string, string> = Object.fromEntries(
  [...DEPOSIT_METHODS, ...WITHDRAW_METHODS].map((m) => [m.key, m.label])
);

interface Props {
  data: WalletData;
  mutate: () => void;
  filters: { fromDate: string; toDate: string; timezone: string };
  setFilters: (f: any) => void;
}

export function WalletLogs({ data, mutate, filters, setFilters }: Props) {
  const [logTab, setLogTab] = useState<(typeof LOG_TABS)[number]>('Report');
  const [reasonModal, setReasonModal] = useState<string | null>(null);

  const deposits = data.logs.filter((l) => l.type === 'deposit');
  const withdrawals = data.logs.filter((l) => l.type === 'withdraw');
  const transfers = data.logs.filter((l) => l.type === 'transfer');
  const transferRequests = transfers.filter((l) => l.status === 'pending');

  const cancelTx = async (id: string) => {
    await api('/api/agent/wallet', {
      method: 'POST',
      body: JSON.stringify({ action: 'cancel', id }),
    });
    mutate();
  };

  const statusChip = (st: string) => (
    <span
      className={cn(
        'rounded px-2 py-0.5 text-xs font-medium capitalize',
        st === 'completed' && 'bg-green-50 text-green-600',
        st === 'pending' && 'bg-amber-50 text-amber-600',
        (st === 'cancelled' || st === 'failed') && 'bg-slate-100 text-slate-500'
      )}
    >
      {st}
    </span>
  );

  const actionCell = (r: LogRow) => {
    if (r.status === 'pending') {
      return (
        <button className="text-red-500 hover:underline" onClick={() => void cancelTx(r.id)}>
          Cancel
        </button>
      );
    }
    if (r.remark && (r.status === 'failed' || r.status === 'cancelled')) {
      return (
        <button
          className="text-slate-400 transition hover:text-blue-500"
          onClick={() => setReasonModal(r.remark!)}
          title="View Reason"
        >
          <Eye size={15} />
        </button>
      );
    }
    return '-';
  };

  return (
    <>
      <Card>
        <div className="flex gap-6 overflow-x-auto border-b border-slate-100 text-sm font-semibold">
          {LOG_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setLogTab(t)}
              className={cn(
                'shrink-0 pb-2',
                logTab === t ? 'border-b-2 border-blue-500 text-blue-500' : 'text-slate-700'
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">Date Range</span>
              <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                <span className="pl-3 text-slate-400">📅</span>
                <input
                  type="date"
                  className="px-2 py-1.5 text-sm text-slate-700 outline-none"
                  value={filters.fromDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFilters({ ...filters, fromDate: e.target.value })
                  }
                />
                <span className="text-slate-300">-</span>
                <input
                  type="date"
                  className="px-2 py-1.5 text-sm text-slate-700 outline-none"
                  value={filters.toDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFilters({ ...filters, toDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 outline-none focus:border-blue-500"
                value={filters.timezone}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFilters({ ...filters, timezone: e.target.value })
                }
              >
                <option value="browser">Browser Local</option>
                <option value="America/New_York">US Eastern (ET)</option>
                <option value="America/Chicago">US Central (CT)</option>
                <option value="America/Denver">US Mountain (MT)</option>
                <option value="America/Los_Angeles">US Pacific (PT)</option>
                <option value="America/Anchorage">US Alaska (AKT)</option>
                <option value="Pacific/Honolulu">US Hawaii (HST)</option>
                <option value="Asia/Shanghai">China (UTC+8)</option>
              </select>
            </div>
            <span className="text-xs text-slate-400">Max query 31 days</span>
            <Btn onClick={() => mutate()}>Search</Btn>
            <Btn
              variant="ghost"
              onClick={() => {
                const d = new Date();
                const t = d.toISOString().split('T')[0];
                d.setDate(d.getDate() - 4);
                const f = d.toISOString().split('T')[0];
                setFilters({ fromDate: f, toDate: t, timezone: 'America/New_York' });
                // We'll let the parent handle the reload once state updates.
              }}
            >
              Reset
            </Btn>
          </div>

          {logTab === 'Report' && (
            <DataTable
              data={data.report}
              rowKey={(r: any) => r.day}
              columns={[
                { header: 'Start Time', accessorKey: 'day', cell: (r: any) => `${r.day} 00:00:00` },
                { header: 'End Time', cell: (r: any) => `${r.day} 23:59:59` },
                {
                  header: 'Deposit',
                  accessorKey: 'deposit',
                  cell: (r: any) => (
                    <span className="font-semibold text-green-600">{fmtMoney(r.deposit)}</span>
                  ),
                },
                {
                  header: 'Deposit Fee',
                  accessorKey: 'depositFee',
                  cell: (r: any) => (
                    <span className="font-semibold text-amber-500">{fmtMoney(r.depositFee)}</span>
                  ),
                },
                { header: 'Deposit Orders', accessorKey: 'depositOrders' },
              ]}
            />
          )}

          {logTab === 'Agent Deposit Log' && (
            <DataTable
              data={deposits}
              rowKey={(r: any) => r.id}
              columns={[
                {
                  header: 'Order No.',
                  accessorKey: 'id',
                  cell: (r: any) => <span className="font-mono text-xs">{orderNo(r.id)}</span>,
                },
                {
                  header: 'Deposit Amount',
                  accessorKey: 'amount',
                  cell: (r: any) => fmtMoney(r.amount),
                },
                {
                  header: 'Payment Method',
                  accessorKey: 'method',
                  cell: (r: any) => (r.method ? (METHOD_LABEL[r.method] ?? r.method) : '-'),
                },
                { header: 'Status', accessorKey: 'status', cell: (r: any) => statusChip(r.status) },
                {
                  header: 'Time',
                  accessorKey: 'createdAt',
                  cell: (r: any) => fmtDateTime(r.createdAt),
                },
                {
                  header: 'Actions',
                  enableSorting: false,
                  enableGlobalFilter: false,
                  cell: actionCell,
                },
              ]}
            />
          )}

          {logTab === 'Agent Withdraw Log' && (
            <DataTable
              data={withdrawals}
              rowKey={(r: any) => r.id}
              columns={[
                {
                  header: 'Order No',
                  accessorKey: 'id',
                  cell: (r: any) => <span className="font-mono text-xs">{orderNo(r.id)}</span>,
                },
                {
                  header: 'Requested Amount',
                  accessorKey: 'amount',
                  cell: (r: any) => fmtMoney(r.amount),
                },
                {
                  header: 'Commission %',
                  accessorKey: 'commissionPer',
                  cell: (r: any) => (r.commissionPer ? `${r.commissionPer}%` : '-'),
                },
                {
                  header: 'Commission Amount',
                  accessorKey: 'fee',
                  cell: (r: any) => (
                    <span className="font-medium text-amber-500">{fmtMoney(r.fee)}</span>
                  ),
                },
                {
                  header: 'Net Payable Amount',
                  accessorKey: 'netAmount',
                  cell: (r: any) => (
                    <span className="font-semibold text-green-600">
                      {r.netAmount != null ? fmtMoney(r.netAmount) : '-'}
                    </span>
                  ),
                },
                {
                  header: 'Balance Before',
                  accessorKey: 'balanceBefore',
                  cell: (r: any) => (r.balanceBefore != null ? fmtMoney(r.balanceBefore) : '-'),
                },
                {
                  header: 'Balance After',
                  accessorKey: 'balanceAfter',
                  cell: (r: any) => (r.balanceAfter != null ? fmtMoney(r.balanceAfter) : '-'),
                },
                {
                  header: 'Order Status',
                  accessorKey: 'status',
                  cell: (r: any) => statusChip(r.status),
                },
                {
                  header: 'Actions',
                  enableSorting: false,
                  enableGlobalFilter: false,
                  cell: actionCell,
                },
              ]}
            />
          )}

          {logTab === 'Agent Transfer Log' && (
            <DataTable
              data={transfers}
              rowKey={(r: any) => r.id}
              columns={[
                {
                  header: 'Transaction ID',
                  accessorKey: 'id',
                  cell: (r: any) => <span className="font-mono text-xs">{orderNo(r.id)}</span>,
                },
                {
                  header: 'Type',
                  accessorKey: 'type',
                  cell: () => <span className="capitalize">Transfer</span>,
                },
                { header: 'Sender', cell: () => data.store.username },
                {
                  header: 'Receiver',
                  accessorKey: 'counterparty',
                  cell: (r: any) => r.counterparty ?? '-',
                },
                { header: 'Amount', accessorKey: 'amount', cell: (r: any) => fmtMoney(r.amount) },
                {
                  header: 'Remark',
                  accessorKey: 'remark',
                  cell: (r: any) => <div className="max-w-48 truncate">{r.remark ?? '-'}</div>,
                },
                {
                  header: 'Time',
                  accessorKey: 'createdAt',
                  cell: (r: any) => fmtDateTime(r.createdAt),
                },
              ]}
            />
          )}

          {logTab === 'Agent Transfer Request Log' && (
            <DataTable
              data={transferRequests}
              rowKey={(r: any) => r.id}
              columns={[
                {
                  header: 'Transaction ID',
                  accessorKey: 'id',
                  cell: (r: any) => <span className="font-mono text-xs">{orderNo(r.id)}</span>,
                },
                { header: 'From', cell: () => data.store.username },
                {
                  header: 'To',
                  accessorKey: 'counterparty',
                  cell: (r: any) => r.counterparty ?? '-',
                },
                { header: 'Amount', accessorKey: 'amount', cell: (r: any) => fmtMoney(r.amount) },
                { header: 'Status', accessorKey: 'status', cell: (r: any) => statusChip(r.status) },
                {
                  header: 'Actions',
                  enableSorting: false,
                  enableGlobalFilter: false,
                  cell: actionCell,
                },
              ]}
            />
          )}
        </div>
      </Card>

      <Modal title="Reason" open={!!reasonModal} onClose={() => setReasonModal(null)}>
        <div className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
          {reasonModal}
        </div>
        <div className="mt-6 flex justify-end">
          <Btn onClick={() => setReasonModal(null)}>Close</Btn>
        </div>
      </Modal>
    </>
  );
}
