'use client';

import { useEffect, useState } from 'react';
import { useDataTable } from '@/hooks/useDataTable';
import { useActionModal } from '@/hooks/useActionModal';
import { Check, X, Search } from 'lucide-react';
import {
  api,
  Btn,
  Card,
  Field,
  fmtDateTime,
  fmtMoney,
  Modal,
  TextInput,
} from '@/components/agent/ui';
import { DataTable } from '@/components/ui/DataTable';

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
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const table = useDataTable<WithdrawalRow>('/api/admin/withdrawals', 'withdrawals');

  const actionModal = useActionModal<WithdrawalRow, 'accept' | 'reject'>();
  const [remark, setRemark] = useState('');

  // Initial load
  useEffect(() => {
    void table.load(1, '', { status: 'pending' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAction = (type: 'accept' | 'reject', row: WithdrawalRow) => {
    actionModal.openModal(row, type);
    setRemark('');
  };

  const submitAction = async () => {
    const { item, actionType } = actionModal;
    if (!item) return;

    if (actionType === 'reject' && !remark.trim()) {
      actionModal.setErr('A reason is required when rejecting a withdrawal.');
      return;
    }

    actionModal.setBusy(true);
    actionModal.setErr(null);
    try {
      await api('/api/admin/withdrawals', {
        method: 'POST',
        body: JSON.stringify({
          id: item.id,
          action: actionType,
          remark,
        }),
      });
      actionModal.closeModal();
      void table.reload();
    } catch (e) {
      actionModal.setErr(e instanceof Error ? e.message : 'Failed to process withdrawal request.');
    } finally {
      actionModal.setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <DataTable
          data={table.rows}
          rowKey={(r) => r.id}
          manualPagination
          totalRows={table.total}
          currentPage={table.page}
          onPageChange={(p) => {
            table.setPage(p);
            void table.load(p, table.search, { status: statusFilter });
          }}
          globalSearch={table.search}
          onSearchChange={(v) => {
            table.setSearch(v);
            void table.load(1, v, { status: statusFilter });
          }}
          extraToolbar={
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Status:</span>
              <select
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  table.setPage(1);
                  void table.load(1, table.search, { status: e.target.value });
                }}
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed / Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          }
          columns={[
            {
              header: 'Order No',
              accessorKey: 'id',
              cell: (r) => (
                <span className="font-mono text-xs" title={r.id}>
                  {r.id.split('-')[0].toUpperCase()}...
                </span>
              ),
            },
            {
              header: 'Agent',
              accessorKey: 'username',
              cell: (r) => <span className="font-medium text-slate-700">{r.username}</span>,
            },
            { header: 'Requested Amount', accessorKey: 'amount', cell: (r) => fmtMoney(r.amount) },
            {
              header: 'Net Payable',
              accessorKey: 'netAmount',
              cell: (r) => (
                <span className="font-semibold text-green-600">
                  {r.netAmount != null ? fmtMoney(r.netAmount) : '-'}
                </span>
              ),
            },
            {
              header: 'Method',
              accessorKey: 'method',
              cell: (r) => (r.method ? WITHDRAW_METHODS[r.method] || r.method : '-'),
            },
            {
              header: 'Address',
              accessorKey: 'address',
              cell: (r) => (
                <div className="max-w-[150px] truncate" title={r.address || ''}>
                  {r.address || '-'}
                </div>
              ),
            },
            { header: 'Status', accessorKey: 'status', cell: (r) => statusChip(r.status) },
            {
              header: 'Reason',
              accessorKey: 'remark',
              cell: (r) => (
                <div className="max-w-[150px] truncate" title={r.remark || ''}>
                  {r.remark || '-'}
                </div>
              ),
            },
            {
              header: 'Created',
              accessorKey: 'createdAt',
              cell: (r) => <span className="text-xs">{fmtDateTime(r.createdAt)}</span>,
            },
            {
              header: 'Actions',
              enableSorting: false,
              enableGlobalFilter: false,
              cell: (r) =>
                r.status === 'pending' ? (
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
                ),
            },
          ]}
        />
      </Card>

      <Modal
        title={actionModal.actionType === 'accept' ? 'Accept Withdrawal' : 'Reject Withdrawal'}
        open={actionModal.open}
        onClose={actionModal.closeModal}
        footer={
          <>
            <Btn variant="ghost" onClick={actionModal.closeModal} disabled={actionModal.busy}>
              Cancel
            </Btn>
            <Btn
              variant={actionModal.actionType === 'accept' ? 'success' : 'danger'}
              onClick={submitAction}
              disabled={actionModal.busy}
            >
              {actionModal.busy ? 'Processing...' : 'Confirm'}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          {actionModal.err && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{actionModal.err}</p>
          )}

          <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Agent:</span>
              <span className="font-semibold text-slate-700">{actionModal.item?.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Requested Amount:</span>
              <span className="font-semibold text-slate-700">
                {fmtMoney(actionModal.item?.amount || '0')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Net Payable:</span>
              <span className="font-semibold text-green-600">
                {fmtMoney(actionModal.item?.netAmount || '0')}
              </span>
            </div>
            {actionModal.actionType === 'reject' && (
              <div className="mt-3 font-medium text-red-500">
                Rejecting this request will immediately refund{' '}
                {fmtMoney(actionModal.item?.amount || '0')} back to the agent&apos;s balance.
              </div>
            )}
          </div>

          <Field label="Reason / Remark" required={actionModal.actionType === 'reject'}>
            <TextInput
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder={
                actionModal.actionType === 'reject'
                  ? 'Please provide a reason for rejection'
                  : 'Optional note'
              }
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
