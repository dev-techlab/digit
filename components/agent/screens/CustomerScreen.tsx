'use client';

import { useCallback, useEffect, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { api, Btn, Card, fmtDateTime, fmtMoney, Modal } from '../ui';
import { DataTable } from '@/components/ui/DataTable';

interface CustomerRow {
  id: string;
  username: string;
  nickname: string;
  email: string | null;
  phone: string | null;
  emailVerified: string | null;
  phoneVerified: string | null;
  usedInviteCode: string | null;
  createdAt: string;
  totalDeposit: string;
  totalWithdrawal: string;
}

interface CustomerDetail {
  customer: CustomerRow;
  logins: { ipAddress: string | null; userAgent: string | null; createdAt: string }[];
  transactions: { type: string; amount: string; createdAt: string }[];
  gameActivity: { providerName: string; balance: string }[];
}

export function CustomerScreen() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [phone, setPhone] = useState('');
  const [detail, setDetail] = useState<CustomerDetail | null>(null);

  const load = useCallback(
    (p = page, q = search, ph = phone) =>
      api<{ customers: CustomerRow[]; total: number }>(
        `/api/agent/customers?page=${p}&pageSize=10&search=${encodeURIComponent(q)}&phone=${encodeURIComponent(ph)}`
      ).then((d) => {
        setRows(d.customers);
        setTotal(d.total);
      }),
    [page, search, phone]
  );
  useEffect(() => {
    void load(1, '', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (row: CustomerRow) => {
    setDetail(await api<CustomerDetail>(`/api/agent/customers/${row.id}`));
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
          pageSize={10}
          onPageChange={(p) => {
            setPage(p);
            void load(p);
          }}
          columns={[
            {
              header: 'Profile',
              cell: (r) => (
                <div>
                  <div className="font-medium">{r.nickname}</div>
                  <div className="text-xs text-slate-500">@{r.username}</div>
                </div>
              ),
            },
            {
              header: 'Contact',
              cell: (r) => (
                <div className="text-xs">
                  <div>
                    Email: {r.email || '-'} {r.emailVerified ? '(Verified)' : ''}
                  </div>
                  <div>
                    Phone: {r.phone || '-'} {r.phoneVerified ? '(Verified)' : ''}
                  </div>
                </div>
              ),
            },
            {
              header: 'Invite Code',
              cell: (r) => <div className="font-mono">{r.usedInviteCode || '-'}</div>,
            },
            {
              header: 'Financials',
              cell: (r) => (
                <div className="text-xs">
                  <div className="text-success">Dep: {fmtMoney(r.totalDeposit)}</div>
                  <div className="text-danger">Wd: {fmtMoney(r.totalWithdrawal)}</div>
                </div>
              ),
            },
            { header: 'Registered', cell: (r) => <>{fmtDateTime(r.createdAt)}</> },
            {
              header: 'Actions',
              cell: (r) => (
                <div className="flex gap-2">
                  <Btn variant="ghost" className="px-2 py-1 text-xs" onClick={() => openDetail(r)}>
                    <MoreHorizontal size={16} /> Details
                  </Btn>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.customer?.nickname ? `${detail.customer.nickname}'s Details` : 'Details'}
        wide={true}
      >
        {detail && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <h3 className="mb-4 text-lg font-bold">Activity History</h3>
                <h4 className="mb-2 font-medium">Recent Logins</h4>
                <div className="space-y-2">
                  {detail.logins.map((lg, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="max-w-[200px] truncate text-slate-500">
                        {lg.userAgent || lg.ipAddress || 'Unknown Device'}
                      </span>
                      <span>{fmtDateTime(lg.createdAt)}</span>
                    </div>
                  ))}
                  {!detail.logins.length && (
                    <div className="text-sm text-slate-500">No recent logins</div>
                  )}
                </div>
              </Card>

              <Card>
                <h3 className="mb-4 text-lg font-bold">Transactions</h3>
                <div className="space-y-2">
                  {detail.transactions.map((tx, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-500">{tx.type}</span>
                      <span className="font-mono font-medium">{fmtMoney(tx.amount)}</span>
                      <span>{fmtDateTime(tx.createdAt)}</span>
                    </div>
                  ))}
                  {!detail.transactions.length && (
                    <div className="text-sm text-slate-500">No transactions</div>
                  )}
                </div>
              </Card>

              <Card>
                <h3 className="mb-4 text-lg font-bold">Game Activity</h3>
                <div className="space-y-2">
                  {detail.gameActivity.map((ga, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-500">{ga.providerName}</span>
                      <span className="font-mono font-medium">{fmtMoney(ga.balance)}</span>
                    </div>
                  ))}
                  {!detail.gameActivity.length && (
                    <div className="text-sm text-slate-500">No game activity</div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
