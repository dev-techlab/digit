'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  api,
  Btn,
  Card,
  fmtDateTime,
  fmtMoney,
  Pagination,
  ResetBtn,
  SearchBtn,
  Select,
  Table,
  TextInput,
} from '@/components/agent/ui';

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
      await api('/api/admin/users', { method: 'PUT', body: JSON.stringify({ id: row.id, status: next }) });
    } catch (e) {
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: row.status } : r)));
      window.alert(e instanceof Error ? e.message : 'Failed to update status.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-500">Search</span>
        <TextInput
          className="w-full sm:w-64"
          placeholder="Username, nickname, email or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-sm text-slate-500">Status</span>
        <Select className="w-full sm:w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </Select>
        <SearchBtn
          onClick={() => {
            setPage(1);
            void load(1);
          }}
        />
        <ResetBtn
          onClick={() => {
            setSearch('');
            setStatus('');
            setPage(1);
            void load(1, '', '');
          }}
        />
      </Card>

      <Card>
        <Table
          headers={[
            'Username',
            'Nickname',
            'Email',
            'Phone',
            'KYC',
            'Gold Coin',
            'Online SC',
            'Invite Code',
            'Registered',
            'Status',
            'Operations',
          ]}
          empty={!loading && rows.length === 0}
        >
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-medium text-slate-700">{r.username}</td>
              <td className="px-4 py-3">{r.nickname}</td>
              <td className="px-4 py-3">{r.email ?? '-'}</td>
              <td className="px-4 py-3">
                {r.phone ?? '-'}
                {r.phoneBound && (
                  <span className="ml-1.5 rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-600">
                    Bound
                  </span>
                )}
              </td>
              <td className="px-4 py-3 capitalize">{r.kycStatus}</td>
              <td className="px-4 py-3">{fmtMoney(r.goldCoin)}</td>
              <td className="px-4 py-3 font-semibold text-green-600">{fmtMoney(r.onlineSc)}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.inviteCode}</td>
              <td className="px-4 py-3">{fmtDateTime(r.createdAt)}</td>
              <td className="px-4 py-3">
                <span
                  className={
                    r.status === 'active'
                      ? 'rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-600'
                      : 'rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-500'
                  }
                >
                  {r.status === 'active' ? 'Active' : 'Blocked'}
                </span>
              </td>
              <td className="px-4 py-3">
                <Btn
                  variant={r.status === 'active' ? 'danger' : 'success'}
                  className="px-3 py-1.5 text-xs"
                  disabled={busyId === r.id}
                  onClick={() => void toggleStatus(r)}
                >
                  {r.status === 'active' ? 'Block' : 'Unblock'}
                </Btn>
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
            void load(p);
          }}
        />
      </Card>
    </div>
  );
}
