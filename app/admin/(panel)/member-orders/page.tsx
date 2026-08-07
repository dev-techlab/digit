'use client';

import { useState } from 'react';
import { useDataTable } from '@/hooks/useDataTable';
import { useActionModal } from '@/hooks/useActionModal';
import { Check, X } from 'lucide-react';
import {
  api,
  Btn,
  Card,
  fmtDateTime,
  fmtMoney,
  Modal,
} from '@/components/agent/ui';
import { DataTable } from '@/components/ui/DataTable';

type Tx = {
  id: string;
  username: string;
  type: string;
  amount: string;
  methodLabel: string;
  status: string;
  createdAt: string;
  agentId?: string;
};

const statusChip = (st: string) => (
  <span
    className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${
      st === 'completed'
        ? 'bg-green-50 text-green-600'
        : st === 'pending'
          ? 'bg-amber-50 text-amber-600'
          : st === 'failed'
            ? 'bg-red-50 text-red-500'
            : 'bg-slate-100 text-slate-500'
    }`}
  >
    {st}
  </span>
);

export default function MemberOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const table = useDataTable<Tx>('/api/admin/member-orders', 'transactions');

  const actionModal = useActionModal<Tx, 'accept' | 'reject'>();

  const submitAction = async () => {
    const { item, actionType } = actionModal;
    if (!item) return;

    actionModal.setBusy(true);
    actionModal.setErr(null);
    try {
      await api('/api/admin/member-orders', {
        method: 'POST',
        body: JSON.stringify({ id: item.id, action: actionType }),
      });
      actionModal.closeModal();
      void table.reload();
    } catch (e) {
      actionModal.setErr(e instanceof Error ? e.message : 'Failed to process transaction.');
    } finally {
      actionModal.setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Member Orders</h1>
      </div>

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
              </select>
            </div>
          }
          columns={[
            {
              header: 'ID',
              accessorKey: 'id',
              cell: (r) => (
                <span className="font-mono text-xs" title={r.id}>
                  {r.id.split('-')[0].toUpperCase()}
                </span>
              ),
            },
            {
              header: 'Username',
              accessorKey: 'username',
              cell: (r) => <span className="font-medium text-slate-700">{r.username}</span>,
            },
            {
              header: 'Agent ID',
              accessorKey: 'agentId',
              cell: (r) => <span className="font-mono text-xs">{r.agentId}</span>,
            },
            {
              header: 'Type',
              accessorKey: 'type',
              cell: (r) => (
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${
                    r.type === 'deposit'
                      ? 'bg-green-50 text-green-600'
                      : 'bg-amber-50 text-amber-600'
                  }`}
                >
                  {r.type}
                </span>
              ),
            },
            { header: 'Amount', accessorKey: 'amount', cell: (r) => fmtMoney(r.amount) },
            {
              header: 'Method',
              accessorKey: 'methodLabel',
              cell: (r) => r.methodLabel || '-',
            },
            { header: 'Status', accessorKey: 'status', cell: (r) => statusChip(r.status) },
            {
              header: 'Date',
              accessorKey: 'createdAt',
              cell: (r) => <span className="text-xs">{fmtDateTime(r.createdAt)}</span>,
            },
            {
              header: 'Action',
              enableSorting: false,
              enableGlobalFilter: false,
              cell: (r) =>
                r.status === 'pending' ? (
                  <div className="flex gap-2">
                    <Btn
                      variant="success"
                      className="px-2 py-1 text-xs"
                      onClick={() => actionModal.openModal(r, 'accept')}
                    >
                      <Check size={14} className="mr-1" /> Approve
                    </Btn>
                    <Btn
                      variant="danger"
                      className="px-2 py-1 text-xs"
                      onClick={() => actionModal.openModal(r, 'reject')}
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
        title={actionModal.actionType === 'accept' ? 'Accept Transaction' : 'Reject Transaction'}
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
              <span className="text-slate-500">Member:</span>
              <span className="font-semibold text-slate-700">{actionModal.item?.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Type:</span>
              <span className="font-semibold capitalize text-slate-700">{actionModal.item?.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount:</span>
              <span className="font-semibold text-slate-700">
                {fmtMoney(actionModal.item?.amount || '0')}
              </span>
            </div>
            {actionModal.actionType === 'reject' && (
              <div className="mt-3 font-medium text-red-500">
                Are you sure you want to reject this transaction?
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
