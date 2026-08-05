import { useState, useEffect, useCallback } from 'react';
import { api, Btn, Card, fmtDateTime, fmtMoney } from '@/components/agent/ui';
import { DataTable } from '@/components/ui/DataTable';

interface PlatformAccountRow {
  id: string;
  gameUsername: string;
  memberUsername: string;
  notes: string;
  createdAt: string;
  balance: string;
  state: string;
}

export function PlatformAccountTable({ platformId }: { platformId: string }) {
  const [rows, setRows] = useState<PlatformAccountRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!platformId) return;
    setLoading(true);
    api<{ accounts: PlatformAccountRow[] }>(`/api/agent/platform-accounts?platformId=${platformId}`)
      .then((d: { accounts: PlatformAccountRow[] }) => setRows(d.accounts))
      .finally(() => setLoading(false));
  }, [platformId]);

  useEffect(() => {
    load();
  }, [load]);

  // We can expose `load` via a ref if the parent needs to refresh the table after creation,
  // but for now we'll just poll or let the parent pass a refresh trigger.

  return (
    <Card className="mt-6">
      <DataTable
        data={rows}
        rowKey={(r) => r.id}
        columns={[
          { header: 'Account #', accessorKey: 'gameUsername', cell: (r) => <span className="font-bold bg-slate-800 text-white px-2 py-1 rounded text-xs">{r.gameUsername}</span> },
          { header: 'Username/Notes', accessorKey: 'notes', cell: (r) => r.notes || r.memberUsername },
          { header: 'Created', accessorKey: 'createdAt', cell: (r) => fmtDateTime(r.createdAt) },
          { header: 'Balance', accessorKey: 'balance', cell: (r) => <span className="text-red-500 font-semibold">{fmtMoney(r.balance)}</span> },
          { header: 'State', accessorKey: 'state', cell: (r) => <span className="bg-red-700 text-white px-2 py-0.5 rounded text-xs uppercase">{r.state}</span> },
          {
            header: 'Purchase / Redeem',
            cell: (r) => (
              <div className="flex gap-0">
                <button className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2 py-1 rounded-l" onClick={() => alert('Purchase coming soon')}>Purchase</button>
                <button className="bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-1 rounded-r" onClick={() => alert('Redeem coming soon')}>Redeem</button>
              </div>
            )
          },
          {
            header: 'Actions',
            cell: (r) => (
              <div className="flex gap-1">
                <button className="bg-slate-200 text-slate-400 text-[10px] px-2 py-1 rounded cursor-not-allowed">Reverse</button>
                <button className="bg-green-500 hover:bg-green-600 text-white text-[10px] px-2 py-1 rounded">Lock</button>
                <button className="bg-slate-200 text-slate-400 text-[10px] px-2 py-1 rounded cursor-not-allowed">PWD</button>
                <button className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] px-2 py-1 rounded">Close</button>
              </div>
            )
          }
        ]}
      />
    </Card>
  );
}
