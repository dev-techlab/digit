'use client';

import { useState } from 'react';
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

interface AgentOrderRow {
  id: string;
  type: 'deposit' | 'withdraw' | 'transfer';
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

const METHODS: Record<string, string> = {
  paypal_pyusd: 'Paypal PYUSD',
  cashapp_usdc: 'Cashapp USDC',
  bitcoin: 'Bitcoin',
  bitcoin_lightning: 'Bitcoin Lightning Network',
  bank_card: 'Bank Card',
  ach: 'ACH Bank Transfer',
};

import { StatusBadge, TypeBadge } from '@/components/admin/ui/OrderBadges';
import { OrderFilters } from '@/components/admin/ui/OrderFilters';

export function AgentOrdersScreen() {
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('');
  
  const table = useDataTable<AgentOrderRow>('/api/admin/agent-orders', 'orders', 20, { status: 'pending' });
  const actionModal = useActionModal<AgentOrderRow, 'accept' | 'reject'>();
  const [remark, setRemark] = useState('');

  const openAction = (type: 'accept' | 'reject', row: AgentOrderRow) => {
    actionModal.openModal(row, type);
    setRemark('');
  };

  const submitAction = async () => {
    const { item, actionType } = actionModal;
    if (!item) return;

    if (actionType === 'reject' && !remark.trim()) {
      actionModal.setFieldErrs({ remark: 'A reason is required when rejecting.' });
      return;
    }

    actionModal.setBusy(true);
    actionModal.setErr(null);
    actionModal.setFieldErrs({});
    try {
      await api('/api/admin/agent-orders', {
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
      actionModal.setErr(e instanceof Error ? e.message : 'Failed to process request.');
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
            <OrderFilters
              typeFilter={typeFilter}
              setTypeFilter={(v) => {
                setTypeFilter(v);
                table.setPage(1);
                table.load(1, table.search, { status: statusFilter, type: v });
              }}
              statusFilter={statusFilter}
              setStatusFilter={(v) => {
                setStatusFilter(v);
                table.setPage(1);
                table.load(1, table.search, { status: v, type: typeFilter });
              }}
            />
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
              header: 'Type',
              accessorKey: 'type',
              cell: (r) => <TypeBadge type={r.type} />,
            },
            {
              header: 'Agent',
              accessorKey: 'username',
              cell: (r) => <span className="font-medium text-slate-700">{r.username}</span>,
            },
            { header: 'Amount', accessorKey: 'amount', cell: (r) => fmtMoney(r.amount) },
            {
              header: 'Net Payable',
              accessorKey: 'netAmount',
              cell: (r) => (
                r.type === 'withdraw' ? (
                  <span className="font-semibold text-green-600">
                    {r.netAmount != null ? fmtMoney(r.netAmount) : '-'}
                  </span>
                ) : <span className="text-slate-400">-</span>
              ),
            },
            {
              header: 'Method',
              accessorKey: 'method',
              cell: (r) => (r.method ? METHODS[r.method] || r.method : '-'),
            },
            { header: 'Status', accessorKey: 'status', cell: (r) => <StatusBadge status={r.status} /> },
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
        title={actionModal.actionType === 'accept' ? `Accept ${actionModal.item?.type || 'Order'}` : `Reject ${actionModal.item?.type || 'Order'}`}
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
            {actionModal.item?.type === 'withdraw' && (
              <div className="flex justify-between">
                <span className="text-slate-500">Net Payable:</span>
                <span className="font-semibold text-green-600">
                  {fmtMoney(actionModal.item?.netAmount || '0')}
                </span>
              </div>
            )}

            {actionModal.actionType === 'accept' && actionModal.item?.type === 'deposit' && (
              <div className="mt-3 font-medium text-green-600">
                Accepting this deposit will immediately add {fmtMoney(actionModal.item?.amount || '0')} to the agent&apos;s balance.
              </div>
            )}
            
            {actionModal.actionType === 'reject' && actionModal.item?.type === 'deposit' && (
              <div className="mt-3 font-medium text-red-500">
                Rejecting this deposit will fail the request and no balance will be added.
              </div>
            )}

            {actionModal.actionType === 'reject' && actionModal.item?.type === 'withdraw' && (
              <div className="mt-3 font-medium text-red-500">
                Rejecting this request will immediately refund {fmtMoney(actionModal.item?.amount || '0')} back to the agent&apos;s balance.
              </div>
            )}
          </div>

          <Field 
            label="Reason / Remark" 
            required={actionModal.actionType === 'reject'}
            error={actionModal.fieldErrs.remark}
          >
            <TextInput
              value={remark}
              onChange={(e) => {
                setRemark(e.target.value);
                actionModal.setFieldErrs((prev) => ({ ...prev, remark: '' }));
              }}
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
