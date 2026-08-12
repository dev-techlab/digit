'use client';

import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Gamepad2, MoreHorizontal, AlertCircle } from 'lucide-react';
import { api, Btn, Card, Field, fmtDateTime, fmtMoney, Modal, TextInput } from '../ui';
import { DataTable } from '@/components/ui/DataTable';

interface MemberRow {
  id: string;
  username: string;
  phone: string | null;
  saleAgent: string | null;
  onlineSc: string;
  scRewardEnabled: boolean;
  remark: string | null;
  deposit: string;
  withdraw: string;
  totalNet: string;
  totalIn: string;
  totalOut: string;
}

interface MemberDetail {
  member: { username: string; remark: string | null };
  logins: { ipAddress: string | null; device: string | null; createdAt: string }[];
  bindings: { platform: string; gameUsername: string | null }[];
}

const randUser = () => String(Math.floor(1000000 + Math.random() * 9000000));
const randPass = () => String(Math.floor(100000 + Math.random() * 900000));

export function MemberScreen() {
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [phone, setPhone] = useState('');
  const [view, setView] = useState<'list' | 'create'>('list');
  const [editRow, setEditRow] = useState<MemberRow | null>(null);
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [remark, setRemark] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(
    (p = page, q = search, ph = phone) =>
      api<{ members: MemberRow[]; total: number }>(
        `/api/agent/members?page=${p}&pageSize=10&search=${encodeURIComponent(q)}&phone=${encodeURIComponent(ph)}`
      ).then((d) => {
        setRows(d.members);
        setTotal(d.total);
      }),
    [page, search, phone]
  );
  useEffect(() => {
    if (view === 'list') {
      void load(1, '', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const saveEdit = async () => {
    if (!editRow) return;
    setErr(null);
    try {
      await api('/api/agent/members', {
        method: 'PUT',
        body: JSON.stringify({ id: editRow.id, remark }),
      });
      setEditRow(null);
      void load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const openDetail = async (row: MemberRow) => {
    setDetail(await api<MemberDetail>(`/api/agent/members/${row.id}`));
  };

  if (view === 'create') {
    import('@/components/agent/PlayerCreateView').then(); // preload
  }

  return (
    <div className="space-y-4">
      {view === 'create' ? (
        <React.Suspense fallback={<div>Loading...</div>}>
          {React.createElement(require('@/components/agent/PlayerCreateView').PlayerCreateView, {
            onBack: () => setView('list'),
          })}
        </React.Suspense>
      ) : (
        <Card>
          <Btn variant="success" className="mb-4" onClick={() => setView('create')}>
            <Plus size={16} /> Add Player
          </Btn>
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
                <span className="text-sm text-slate-500">Phone:</span>
                <TextInput
                  className="w-32 py-1.5"
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPhone(val);
                    setPage(1);
                    void load(1, search, val);
                  }}
                />
              </div>
            }
            columns={[
              {
                header: 'Username',
                accessorKey: 'username',
                className: 'sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#f1f5f9]',
                cell: (r) => (
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-700">{r.username}</span>
                    {!r.scRewardEnabled && (
                      <span title="No SC Reward" className="flex items-center">
                        <AlertCircle size={14} className="text-red-500" />
                      </span>
                    )}
                  </div>
                ),
              },
              { header: 'Phone', accessorKey: 'phone', cell: (r) => r.phone ?? '' },
              { header: 'Sale Agent', accessorKey: 'saleAgent', cell: (r) => r.saleAgent ?? '-' },
              {
                header: 'Online SC',
                accessorKey: 'onlineSc',
                cell: (r) => (
                  <span className="font-semibold text-green-600">{fmtMoney(r.onlineSc)}</span>
                ),
              },
              { header: 'Deposit', accessorKey: 'deposit', cell: (r) => fmtMoney(r.deposit) },
              { header: 'Withdraw', accessorKey: 'withdraw', cell: (r) => fmtMoney(r.withdraw) },
              {
                header: 'TotalNet',
                accessorKey: 'totalNet',
                cell: (r) => (
                  <span className="font-semibold text-green-600">{fmtMoney(r.totalNet)}</span>
                ),
              },
              {
                header: 'TotalIn Score',
                accessorKey: 'totalIn',
                cell: (r) => Number(r.totalIn).toFixed(2),
              },
              {
                header: 'TotalOut Score',
                accessorKey: 'totalOut',
                cell: (r) => Number(r.totalOut).toFixed(2),
              },
              {
                header: 'Operations',
                enableSorting: false,
                enableGlobalFilter: false,
                cell: (r) => (
                  <div className="flex items-center gap-3">
                    <button
                      className="text-slate-400 hover:text-blue-500"
                      title="Game Platform Binding"
                      onClick={() => void openDetail(r)}
                    >
                      <Gamepad2 size={16} />
                    </button>
                    <button
                      className="text-slate-400 hover:text-slate-700"
                      title="More Options"
                      onClick={() => {
                        setEditRow(r);
                        setRemark(r.remark ?? '');
                        setErr(null);
                      }}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      <Modal
        title={editRow ? `Edit Member[${editRow.username}]` : ''}
        open={!!editRow}
        onClose={() => setEditRow(null)}
        footer={
          <>
            <Btn onClick={saveEdit}>Save</Btn>
            <Btn variant="ghost" onClick={() => setEditRow(null)}>
              Cancel
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Remark">
            <TextInput
              placeholder="Enter remark..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </Field>
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{err}</p>}
        </div>
      </Modal>

      <Modal
        title={detail ? `Member ${detail.member.username}` : ''}
        open={!!detail}
        onClose={() => setDetail(null)}
        wide
      >
        {detail && (
          <div className="space-y-6">
            <div>
              <h4 className="mb-2 font-semibold text-slate-700">Game Platform Bindings</h4>
              <DataTable
                data={detail.bindings}
                rowKey={(r) => r.platform}
                columns={[
                  { header: 'Platform', accessorKey: 'platform' },
                  {
                    header: 'Game Username',
                    accessorKey: 'gameUsername',
                    cell: (r) => r.gameUsername ?? '-',
                  },
                ]}
              />
            </div>
            <div>
              <h4 className="mb-2 font-semibold text-slate-700">Login History</h4>
              <DataTable
                data={detail.logins}
                rowKey={(r) => r.createdAt}
                columns={[
                  {
                    header: 'Time',
                    accessorKey: 'createdAt',
                    cell: (r) => fmtDateTime(r.createdAt),
                  },
                  { header: 'IP', accessorKey: 'ipAddress', cell: (r) => r.ipAddress ?? '-' },
                  { header: 'Device', accessorKey: 'device', cell: (r) => r.device ?? '-' },
                ]}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
