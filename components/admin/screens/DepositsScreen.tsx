'use client';

import { useEffect, useState } from 'react';
import { useDataTable } from '@/hooks/useDataTable';
import { useActionModal } from '@/hooks/useActionModal';
import { Check, X } from 'lucide-react';
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

interface DepositRow {
  id: string;
  agentId: string;
  username: string;
  method: string | null;
  amount: string;
  netAmount: string | null;
  address: string | null;
  balanceBefore: string | null;
  balanceAfter: string | null;
  remark: string | null;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
}

const DEPOSIT_METHODS: Record<string, string> = {
  paypal_pyusd: 'Paypal PYUSD',
  cashapp_usdc: 'Cashapp USDC',
  bitcoin: 'Bitcoin',
  bitcoin_lightning: 'Bitcoin Lightning Network',
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

export function DepositsScreen() {
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const table = useDataTable<DepositRow>('/api/admin/deposits', 'deposits', 20, {
    status: 'pending',
  });

  const actionModal = useActionModal<DepositRow, 'accept' | 'reject'>();
  const [remark, setRemark] = useState('');

  // SWR fetches automatically based on default status='pending'

  const openAction = (type: 'accept' | 'reject', row: DepositRow) => {
    actionModal.openModal(row, type);
    setRemark('');
  };

  const submitAction = async () => {
    const { item, actionType } = actionModal;
    if (!item) return;

    if (actionType === 'reject' && !remark.trim()) {
      actionModal.setErr('A reason is required when rejecting a deposit.');
      return;
    }

    actionModal.setBusy(true);
    actionModal.setErr(null);
    try {
      await api('/api/admin/deposits', {
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
      actionModal.setErr(e instanceof Error ? e.message : 'Failed to process deposit request.');
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
          onPageChange={(p) => table.setPage(p)}
          pageSize={table.pageSize}
          onPageSizeChange={table.setPageSize}
          globalSearch={table.search}
          onSearchChange={(v) => {
            table.setSearch(v);
            table.setPage(1);
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
                  table.load(1, table.search, { status: e.target.value });
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
              header: 'Method',
              accessorKey: 'method',
              cell: (r) => (r.method ? DEPOSIT_METHODS[r.method] || r.method : '-'),
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
        title={actionModal.actionType === 'accept' ? 'Accept Deposit' : 'Reject Deposit'}
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
            {actionModal.actionType === 'accept' && (
              <div className="mt-3 font-medium text-green-600">
                Accepting this deposit will immediately add{' '}
              </div>
            )}
            {actionModal.actionType === 'reject' && (
              <div className="mt-3 font-medium text-red-500">
                Rejecting this deposit will fail the request and no balance will be added.
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
