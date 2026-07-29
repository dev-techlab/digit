'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
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

interface WithdrawalRow {
  id: string;
  agentId: string;
  username: string;
  method: string | null;
  amount: string;
  fee: string;
  commissionPer: string;
  netAmount: string | null;
  address: string | null;
  balanceBefore: string | null;
  balanceAfter: string | null;
  remark: string | null;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
}

const WITHDRAW_METHODS: Record<string, string> = {
  paypal_pyusd: 'Paypal PYUSD',
  cashapp_usdc: 'Cashapp USDC',
  bitcoin: 'Bitcoin',
  bank_card: 'Bank Card',
  ach: 'ACH Bank Transfer',
};

const statusChip = (st: string) => (
  <span
    className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${
      st === 'completed'
        ? 'bg-green-50 text-green-600'
        : st === 'pending'
        ? 'bg-amber-50 text-amber-600'
        : 'bg-slate-100 text-slate-500'
    }`}
  >
    {st}
  </span>
);

export function WithdrawalsScreen() {
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [loading, setLoading] = useState(true);

  const [actionModal, setActionModal] = useState<{ open: boolean; type: 'accept' | 'reject'; row: WithdrawalRow | null }>({
    open: false,
    type: 'accept',
    row: null,
  });
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(
    (p = page, q = search, s = statusFilter) =>
      api<{ withdrawals: WithdrawalRow[]; total: number }>(
        `/api/admin/withdrawals?page=${p}&pageSize=20&search=${encodeURIComponent(q)}&status=${encodeURIComponent(s)}`
      )
        .then((d) => {
          setRows(d.withdrawals);
          setTotal(d.total);
        })
        .finally(() => setLoading(false)),
    [page, search, statusFilter]
  );

  useEffect(() => {
    void load(1, search, statusFilter);
  }, []);

  const openAction = (type: 'accept' | 'reject', row: WithdrawalRow) => {
    setActionModal({ open: true, type, row });
    setRemark('');
    setErr(null);
  };

  const submitAction = async () => {
    const { row, type } = actionModal;
    if (!row) return;

    if (type === 'reject' && !remark.trim()) {
      setErr('A reason is required when rejecting a withdrawal.');
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      await api('/api/admin/withdrawals', {
        method: 'POST',
        body: JSON.stringify({
          id: row.id,
          action: type,
          remark,
        }),
      });
      setActionModal({ open: false, type: 'accept', row: null });
      void load(page, search, statusFilter);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to process withdrawal request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-500">Status</span>
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
            void load(1, search, e.target.value);
          }}
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed / Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <span className="text-sm text-slate-500 ml-2">Search</span>
        <TextInput
          className="w-full sm:w-64"
          placeholder="Username or Transaction ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SearchBtn
          onClick={() => {
            setPage(1);
            void load(1, search, statusFilter);
          }}
        />
        <ResetBtn
          onClick={() => {
            setSearch('');
            setStatusFilter('pending');
            setPage(1);
            void load(1, '', 'pending');
          }}
        />
      </Card>

      <Card>
        <Table
          headers={[
            'Order No',
            'Agent',
            'Requested Amount',
            'Net Payable',
            'Method',
            'Address',
            'Status',
            'Reason',
            'Created',
            'Actions',
          ]}
          empty={!loading && rows.length === 0}
        >
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-mono text-xs" title={r.id}>
                {r.id.split('-')[0].toUpperCase()}...
              </td>
              <td className="px-4 py-3 font-medium text-slate-700">{r.username}</td>
              <td className="px-4 py-3">{fmtMoney(r.amount)}</td>
              <td className="px-4 py-3 font-semibold text-green-600">
                {r.netAmount != null ? fmtMoney(r.netAmount) : '-'}
              </td>
              <td className="px-4 py-3">{r.method ? WITHDRAW_METHODS[r.method] || r.method : '-'}</td>
              <td className="px-4 py-3 max-w-[150px] truncate" title={r.address || ''}>
                {r.address || '-'}
              </td>
              <td className="px-4 py-3">{statusChip(r.status)}</td>
              <td className="px-4 py-3 max-w-[150px] truncate" title={r.remark || ''}>
                {r.remark || '-'}
              </td>
              <td className="px-4 py-3 text-xs">{fmtDateTime(r.createdAt)}</td>
              <td className="px-4 py-3">
                {r.status === 'pending' ? (
                  <div className="flex gap-2">
                    <Btn
                      variant="success"
                      className="px-2 py-1 text-xs"
                      onClick={() => openAction('accept', r)}
                    >
                      <Check size={14} className="mr-1" /> Accept
                    </Btn>
                    <Btn
                      variant="danger"
                      className="px-2 py-1 text-xs"
                      onClick={() => openAction('reject', r)}
                    >
                      <X size={14} className="mr-1" /> Reject
                    </Btn>
                  </div>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
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
            void load(p, search, statusFilter);
          }}
        />
      </Card>

      <Modal
        title={actionModal.type === 'accept' ? 'Accept Withdrawal' : 'Reject Withdrawal'}
        open={actionModal.open}
        onClose={() => !busy && setActionModal({ open: false, type: 'accept', row: null })}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setActionModal({ open: false, type: 'accept', row: null })} disabled={busy}>
              Cancel
            </Btn>
            <Btn
              variant={actionModal.type === 'accept' ? 'success' : 'danger'}
              onClick={submitAction}
              disabled={busy}
            >
              {busy ? 'Processing...' : 'Confirm'}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{err}</p>}
          
          <div className="rounded-lg bg-slate-50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Agent:</span>
              <span className="font-semibold text-slate-700">{actionModal.row?.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Requested Amount:</span>
              <span className="font-semibold text-slate-700">{fmtMoney(actionModal.row?.amount || '0')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Net Payable:</span>
              <span className="font-semibold text-green-600">{fmtMoney(actionModal.row?.netAmount || '0')}</span>
            </div>
            {actionModal.type === 'reject' && (
              <div className="mt-3 text-red-500 font-medium">
                Rejecting this request will immediately refund {fmtMoney(actionModal.row?.amount || '0')} back to the agent's balance.
              </div>
            )}
          </div>

          <Field label="Reason / Remark" required={actionModal.type === 'reject'}>
            <TextInput
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder={actionModal.type === 'reject' ? "Please provide a reason for rejection" : "Optional note"}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
