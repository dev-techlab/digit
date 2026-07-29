'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, Btn, Card, fmtDateTime, fmtMoney, Select } from '@/components/agent/ui';
import { DataTable } from '@/components/ui/DataTable';

interface UserRow {
  id: string;
  username: string;
  nickname: string;
  email: string | null;
  phone: string | null;
  phoneBound: boolean;
  kycStatus: string;
  status: 'active' | 'blocked';
  inviteCode: string;
  createdAt: string;
  goldCoin: string | null;
  onlineSc: string | null;
}

/** Every player who self-registered on the home page / game lobby, with wallet + access controls. */
export function UsersScreen() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    (p = page, q = search, st = status) =>
      api<{ users: UserRow[]; total: number }>(
        `/api/admin/users?page=${p}&pageSize=20&search=${encodeURIComponent(q)}&status=${encodeURIComponent(st)}`
      )
        .then((d) => {
          setRows(d.users);
          setTotal(d.total);
        })
        .finally(() => setLoading(false)),
    [page, search, status]
  );
  useEffect(() => {
    void load(1, '', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleStatus = async (row: UserRow) => {
    const next = row.status === 'active' ? 'blocked' : 'active';
    setBusyId(row.id);
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
    try {
      await api('/api/admin/users', {
        method: 'PUT',
        body: JSON.stringify({ id: row.id, status: next }),
      });
    } catch (e) {
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: row.status } : r)));
      window.alert(e instanceof Error ? e.message : 'Failed to update status.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <DataTable
          data={rows}
          rowKey={(r) => r.id}
          manualPagination
          totalRows={total}
          currentPage={page}
          onPageChange={(p) => {
            setPage(p);
            void load(p);
          }}
          globalSearch={search}
          onSearchChange={setSearch}
          extraToolbar={
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Status:</span>
              <Select
                className="w-32 py-1.5"
                value={status}
                onChange={(e) => {
                  const st = e.target.value;
                  setStatus(st);
                  setPage(1);
                  void load(1, search, st);
                }}
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </Select>
            </div>
          }
          columns={[
            {
              header: 'Username',
              accessorKey: 'username',
              cell: (r) => <span className="font-medium text-slate-700">{r.username}</span>,
            },
            { header: 'Nickname', accessorKey: 'nickname' },
            { header: 'Email', accessorKey: 'email', cell: (r) => r.email ?? '-' },
            {
              header: 'Phone',
              accessorKey: 'phone',
              cell: (r) => (
                <>
                  {r.phone ?? '-'}
                  {r.phoneBound && (
                    <span className="ml-1.5 rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-600">
                      Bound
                    </span>
                  )}
                </>
              ),
            },
            {
              header: 'KYC',
              accessorKey: 'kycStatus',
              cell: (r) => <span className="capitalize">{r.kycStatus}</span>,
            },
            { header: 'Gold Coin', accessorKey: 'goldCoin', cell: (r) => fmtMoney(r.goldCoin) },
            {
              header: 'Online SC',
              accessorKey: 'onlineSc',
              cell: (r) => (
                <span className="font-semibold text-green-600">{fmtMoney(r.onlineSc)}</span>
              ),
            },
            {
              header: 'Invite Code',
              accessorKey: 'inviteCode',
              cell: (r) => <span className="font-mono text-xs text-slate-500">{r.inviteCode}</span>,
            },
            {
              header: 'Registered',
              accessorKey: 'createdAt',
              cell: (r) => fmtDateTime(r.createdAt),
            },
            {
              header: 'Status',
              accessorKey: 'status',
              cell: (r) => (
                <span
                  className={
                    r.status === 'active'
                      ? 'rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-600'
                      : 'rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-500'
                  }
                >
                  {r.status === 'active' ? 'Active' : 'Blocked'}
                </span>
              ),
            },
            {
              header: 'Operations',
              enableSorting: false,
              enableGlobalFilter: false,
              cell: (r) => (
                <Btn
                  variant={r.status === 'active' ? 'danger' : 'success'}
                  className="px-3 py-1.5 text-xs"
                  disabled={busyId === r.id}
                  onClick={() => void toggleStatus(r)}
                >
                  {r.status === 'active' ? 'Block' : 'Unblock'}
                </Btn>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
