'use client';

import { useDataTable } from '@/hooks/useDataTable';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';

type Tx = {
  id: string;
  username: string;
  type: string;
  amount: string;
  methodLabel: string;
  status: string;
  createdAt: string;
};

export default function CustomerOrdersPage() {
  const table = useDataTable<Tx>('/api/agent/customer-orders', 'transactions');

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Customer Orders</h1>
      </div>

      <Card>
        <DataTable
          data={table.rows}
          rowKey={(tx) => tx.id}
          loading={table.loading}
          totalRows={table.total}
          currentPage={table.page}
          onPageChange={table.setPage}
          pageSize={table.pageSize}
          onPageSizeChange={table.setPageSize}
          searchPlaceholder="Search username..."
          globalSearch={table.search}
          onSearchChange={table.setSearch}
          manualPagination={true}
          columns={[
            {
              header: 'ID',
              accessorKey: 'id',
              cell: (tx) => <span className="font-mono text-xs">{tx.id}</span>,
            },
            {
              header: 'Username',
              accessorKey: 'username',
            },
            {
              header: 'Type',
              accessorKey: 'type',
              cell: (tx) => (
                <Badge tone={tx.type === 'deposit' ? 'success' : 'warning'}>{tx.type}</Badge>
              ),
            },
            {
              header: 'Amount',
              accessorKey: 'amount',
              cell: (tx) => <span className="font-mono">${Number(tx.amount).toFixed(2)}</span>,
            },
            {
              header: 'Method',
              accessorKey: 'methodLabel',
            },
            {
              header: 'Status',
              accessorKey: 'status',
              cell: (tx) => (
                <Badge
                  tone={
                    tx.status === 'completed'
                      ? 'success'
                      : tx.status === 'failed'
                        ? 'danger'
                        : 'neutral'
                  }
                >
                  {tx.status}
                </Badge>
              ),
            },
            {
              header: 'Date',
              accessorKey: 'createdAt',
              cell: (tx) => new Date(tx.createdAt).toLocaleString(),
            },
          ]}
        />
      </Card>
    </div>
  );
}
