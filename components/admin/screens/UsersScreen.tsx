'use client';

import { useState } from 'react';
import { Plus, Edit, Copy } from 'lucide-react';
import { api, Btn, Card, Field, fmtDateTime, fmtMoney, Modal, Select, TextInput } from '@/components/agent/ui';
import { DataTable } from '@/components/ui/DataTable';
import { useDataTable } from '@/hooks/useDataTable';
import { useActionModal } from '@/hooks/useActionModal';

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
  commissionPer: string;
  createdAt: string;
  goldCoin: string | null;
  onlineSc: string | null;
}

const emptyForm = () => {
  const randomChars = Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map((b) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 36])
    .join('');

  return {
    username: '',
    password: '',
    nickname: '',
    email: '',
    phone: '',
    kycStatus: 'unverified',
    commissionPer: '30.00',
    inviteCode: randomChars,
    goldCoin: '',
    onlineSc: '',
  };
};

/** Every player who self-registered on the home page / game lobby, with wallet + access controls. */
export function UsersScreen() {
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const table = useDataTable<UserRow>('/api/admin/users', 'users');

  const createModal = useActionModal<null>();
  const [form, setForm] = useState(emptyForm());
  const [created, setCreated] = useState<{ username: string; password: string } | null>(null);

  const editModal = useActionModal<UserRow>();
  const [editForm, setEditForm] = useState({
    username: '',
    password: '',
    nickname: '',
    email: '',
    phone: '',
    kycStatus: '',
    commissionPer: '0',
    inviteCode: '',
    goldCoin: '',
    onlineSc: '',
  });

  const deleteModal = useActionModal<UserRow>();

  // Purchase / Redeem Modal State
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [actionAccount, setActionAccount] = useState<UserRow | null>(null);
  const [amount, setAmount] = useState('0.00');
  const [actionSaving, setActionSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const openPurchaseModal = (account: UserRow) => {
    setActionAccount(account);
    setAmount('0.00');
    setActionError(null);
    setPurchaseModalOpen(true);
  };

  const openRedeemModal = (account: UserRow) => {
    setActionAccount(account);
    setAmount('0.00');
    setActionError(null);
    setRedeemModalOpen(true);
  };

  const submitActionAmount = async (action: 'deposit' | 'withdraw') => {
    if (!actionAccount) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setActionError('Please enter a valid amount greater than 0');
      return;
    }
    setActionSaving(true);
    setActionError(null);
    try {
      await api(`/api/admin/users/${actionAccount.id}/transactions`, {
        method: 'POST',
        body: JSON.stringify({ action, amount: val })
      });
      setPurchaseModalOpen(false);
      setRedeemModalOpen(false);
      void table.reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setActionSaving(false);
    }
  };

  const create = async () => {
    createModal.setErr(null);
    createModal.setBusy(true);
    try {
      const payload: any = {
        username: form.username,
        password: form.password,
        nickname: form.nickname,
        email: form.email,
        phone: form.phone,
        kycStatus: form.kycStatus,
        commissionPer: form.commissionPer,
        inviteCode: form.inviteCode,
      };
      
      if (form.goldCoin !== '') payload.goldCoin = Number(form.goldCoin);
      if (form.onlineSc !== '') payload.onlineSc = Number(form.onlineSc);

      const res = await api<{ user: { username: string; password: string } }>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setForm(emptyForm());
      void table.reload();
      createModal.closeModal();
      setCreated(res.user);
    } catch (e) {
      createModal.setErr(e instanceof Error ? e.message : 'Failed to create user.');
    } finally {
      createModal.setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!editModal.item) return;
    editModal.setErr(null);
    editModal.setBusy(true);
    try {
      const payload: any = {
        id: editModal.item.id,
        username: editForm.username,
        password: editForm.password,
        nickname: editForm.nickname,
        email: editForm.email,
        phone: editForm.phone,
        kycStatus: editForm.kycStatus,
        commissionPer: editForm.commissionPer,
        inviteCode: editForm.inviteCode,
      };
      
      if (editForm.goldCoin !== '') payload.goldCoin = Number(editForm.goldCoin);
      if (editForm.onlineSc !== '') payload.onlineSc = Number(editForm.onlineSc);

      await api('/api/admin/users', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      void table.reload();
      editModal.closeModal();
    } catch (e) {
      editModal.setErr(e instanceof Error ? e.message : 'Failed to update user.');
    } finally {
      editModal.setBusy(false);
    }
  };

  const deleteUser = async () => {
    if (!deleteModal.item) return;
    deleteModal.setErr(null);
    deleteModal.setBusy(true);
    try {
      await api(`/api/admin/users?id=${deleteModal.item.id}`, { method: 'DELETE' });
      void table.reload();
      deleteModal.closeModal();
    } catch (e) {
      deleteModal.setErr(e instanceof Error ? e.message : 'Failed to delete user.');
    } finally {
      deleteModal.setBusy(false);
    }
  };

  const toggleStatus = async (row: UserRow) => {
    const next = row.status === 'active' ? 'blocked' : 'active';
    setBusyId(row.id);
    table.setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
    try {
      await api('/api/admin/users', {
        method: 'PUT',
        body: JSON.stringify({ id: row.id, status: next }),
      });
    } catch (e) {
      table.setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: row.status } : r)));
      window.alert(e instanceof Error ? e.message : 'Failed to update status.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <Btn
          variant="success"
          className="mb-4"
          onClick={() => {
            setForm(emptyForm());
            createModal.openModal(null);
          }}
        >
          <Plus size={16} /> Add Customer
        </Btn>

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
              <Select
                className="w-32 py-1.5"
                value={status}
                onChange={(e) => {
                  const st = e.target.value;
                  setStatus(st);
                  table.setPage(1);
                  table.load(1, table.search, { status: st });
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
              header: 'Commission %',
              accessorKey: 'commissionPer',
              cell: (r) => `${r.commissionPer ?? 30}%`,
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
              header: 'Purchase / Redeem',
              cell: (r) => (
                <div className="flex items-center">
                  <button 
                    className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] px-2 py-1 rounded-l shadow-sm font-semibold disabled:opacity-50" 
                    disabled={actionSaving && actionAccount?.id === r.id}
                    onClick={() => openPurchaseModal(r)}>
                    Purchase
                  </button>
                  <button 
                    className="bg-red-600 hover:bg-red-700 text-white text-[11px] px-2 py-1 rounded-r shadow-sm font-semibold disabled:opacity-50" 
                    disabled={actionSaving && actionAccount?.id === r.id}
                    onClick={() => openRedeemModal(r)}>
                    Redeem
                  </button>
                </div>
              )
            },
            {
              header: 'Edit',
              enableSorting: false,
              enableGlobalFilter: false,
              cell: (r) => (
                <Btn
                  variant="ghost"
                  className="px-1 text-slate-500 hover:text-blue-600"
                  disabled={editModal.busy && editModal.item?.id === r.id}
                  onClick={() => {
                    setEditForm({
                      username: r.username,
                      password: '', // leave empty unless changing
                      nickname: r.nickname ?? '',
                      email: r.email ?? '',
                      phone: r.phone ?? '',
                      kycStatus: r.kycStatus,
                      commissionPer: r.commissionPer ?? '30',
                      inviteCode: r.inviteCode,
                      goldCoin: r.goldCoin ? String(r.goldCoin) : '0',
                      onlineSc: r.onlineSc ? String(r.onlineSc) : '0',
                    });
                    editModal.openModal(r);
                  }}
                >
                  <Edit size={16} />
                </Btn>
              ),
            },
            {
              header: 'Security',
              enableSorting: false,
              enableGlobalFilter: false,
              cell: (r) => (
                <button
                  className={`${
                    r.status === 'active'
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-orange-500 hover:bg-orange-600'
                  } text-white p-1 rounded shadow-sm disabled:opacity-50`}
                  title={r.status === 'active' ? 'Block Access' : 'Restore Access'}
                  disabled={busyId === r.id}
                  onClick={() => void toggleStatus(r)}
                >
                  {r.status === 'active' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                  )}
                </button>
              ),
            },
            {
              header: 'Delete',
              enableSorting: false,
              enableGlobalFilter: false,
              cell: (r) => (
                <button
                  className="bg-red-600 hover:bg-red-700 text-white text-[11px] px-2 py-1 rounded shadow-sm font-semibold disabled:opacity-50"
                  disabled={busyId === r.id || (deleteModal.busy && deleteModal.item?.id === r.id)}
                  onClick={() => deleteModal.openModal(r)}
                >
                  Delete
                </button>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="Add Customer"
        open={createModal.open}
        onClose={createModal.closeModal}
        footer={
          <>
            <Btn variant="ghost" onClick={createModal.closeModal}>
              Cancel
            </Btn>
            <Btn onClick={create} disabled={createModal.busy}>
              {createModal.busy ? 'Creating…' : 'Confirm'}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          {createModal.err && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{createModal.err}</p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Username" required>
              <TextInput
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Min. 4 characters"
              />
            </Field>
            <Field label="Password" required>
              <TextInput
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 6 characters"
              />
            </Field>
            <Field label="Nickname" required>
              <TextInput
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <TextInput
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <TextInput
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="KYC Status">
              <Select
                value={form.kycStatus}
                onChange={(e) => setForm({ ...form, kycStatus: e.target.value })}
              >
                <option value="unverified">Unverified</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </Select>
            </Field>
            <Field label="Commission %">
              <div className="relative">
                <TextInput
                  type="number"
                  value={form.commissionPer}
                  onChange={(e) => setForm({ ...form, commissionPer: e.target.value })}
                  className="pr-8"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-sm text-slate-400">%</span>
                </div>
              </div>
            </Field>
            <Field label="Invite Code">
              <TextInput
                value={form.inviteCode}
                onChange={(e) => setForm({ ...form, inviteCode: e.target.value })}
              />
            </Field>
            <Field label="Gold Coin">
              <TextInput
                type="number"
                step="0.01"
                value={form.goldCoin}
                onChange={(e) => setForm({ ...form, goldCoin: e.target.value })}
              />
            </Field>
            <Field label="Online SC">
              <TextInput
                type="number"
                step="0.01"
                value={form.onlineSc}
                onChange={(e) => setForm({ ...form, onlineSc: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        title="Customer Created"
        open={!!created}
        onClose={() => setCreated(null)}
        footer={<Btn onClick={() => setCreated(null)}>Done</Btn>}
      >
        {created && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Save these credentials now — this is the only time the password is shown.
            </p>
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Username</span>
                <span className="font-mono font-semibold text-slate-700">{created.username}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Password</span>
                <span className="font-mono font-semibold text-slate-700">{created.password}</span>
              </div>
            </div>
            <Btn
              variant="ghost"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(`${created.username} / ${created.password}`)
                  .catch(() => {});
              }}
            >
              <Copy size={14} /> Copy credentials
            </Btn>
          </div>
        )}
      </Modal>

      <Modal
        title="Edit Customer"
        open={editModal.open}
        onClose={editModal.closeModal}
        footer={
          <>
            <Btn variant="ghost" onClick={editModal.closeModal}>
              Cancel
            </Btn>
            <Btn onClick={saveEdit} disabled={editModal.busy}>
              {editModal.busy ? 'Saving…' : 'Save'}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          {editModal.err && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{editModal.err}</p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Username">
              <TextInput
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
              />
            </Field>
            <Field label="Password">
              <TextInput
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Leave blank to keep current"
              />
            </Field>
            <Field label="Nickname">
              <TextInput
                value={editForm.nickname}
                onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <TextInput
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <TextInput
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </Field>
            <Field label="KYC Status">
              <Select
                value={editForm.kycStatus}
                onChange={(e) => setEditForm({ ...editForm, kycStatus: e.target.value })}
              >
                <option value="unverified">Unverified</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </Select>
            </Field>
            <Field label="Commission %">
              <div className="relative">
                <TextInput
                  type="number"
                  value={editForm.commissionPer}
                  onChange={(e) => setEditForm({ ...editForm, commissionPer: e.target.value })}
                  className="pr-8"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-sm text-slate-400">%</span>
                </div>
              </div>
            </Field>
            <Field label="Invite Code">
              <TextInput
                value={editForm.inviteCode}
                onChange={(e) => setEditForm({ ...editForm, inviteCode: e.target.value })}
              />
            </Field>
            <Field label="Gold Coin">
              <TextInput
                type="number"
                step="0.01"
                value={editForm.goldCoin}
                onChange={(e) => setEditForm({ ...editForm, goldCoin: e.target.value })}
              />
            </Field>
            <Field label="Online SC">
              <TextInput
                type="number"
                step="0.01"
                value={editForm.onlineSc}
                onChange={(e) => setEditForm({ ...editForm, onlineSc: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        title="Confirm Delete"
        open={deleteModal.open}
        onClose={deleteModal.closeModal}
        footer={
          <>
            <Btn variant="ghost" onClick={deleteModal.closeModal}>
              Cancel
            </Btn>
            <Btn variant="danger" onClick={deleteUser} disabled={deleteModal.busy}>
              {deleteModal.busy ? 'Deleting…' : 'Delete'}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          {deleteModal.err && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{deleteModal.err}</p>
          )}
          <p className="text-slate-700">
            Are you sure you want to delete customer <strong>{deleteModal.item?.username}</strong>? This action cannot be undone.
          </p>
        </div>
      </Modal>

      <Modal
        title="Purchase"
        open={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        footer={
          <>
            <Btn onClick={() => submitActionAmount('deposit')} disabled={actionSaving} className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600">
              {actionSaving ? 'Processing...' : 'Purchase'}
            </Btn>
            <Btn variant="ghost" onClick={() => setPurchaseModalOpen(false)}>Cancel</Btn>
          </>
        }
      >
        <div className="space-y-4 text-center">
          {actionError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 text-left">{actionError}</p>
          )}
          <div className="flex justify-center items-center gap-2 mb-4">
            <span className="text-slate-500 text-sm">Account #</span>
            <span className="font-bold text-green-600 text-lg">{actionAccount?.username}</span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">Amount</span>
              <TextInput
                type="number"
                className="w-32 text-center"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            
            <div className="mt-4 text-slate-500 text-xs">Quick amounts:</div>
            <div className="flex gap-2 flex-wrap justify-center max-w-[250px] mt-1">
              {[5, 10, 20, 50, 100].map(val => (
                <button
                  key={val}
                  onClick={() => setAmount((parseFloat(amount || '0') + val).toFixed(2))}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-3 py-1 rounded shadow-sm text-sm"
                >
                  +${val}
                </button>
              ))}
              <button
                onClick={() => setAmount('0.00')}
                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded shadow-sm text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        title="Redeem from the balance"
        open={redeemModalOpen}
        onClose={() => setRedeemModalOpen(false)}
        footer={
          <>
            <Btn onClick={() => submitActionAmount('withdraw')} disabled={actionSaving} className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600">
              {actionSaving ? 'Processing...' : 'Redeem'}
            </Btn>
            <Btn variant="ghost" onClick={() => setRedeemModalOpen(false)}>Cancel</Btn>
          </>
        }
      >
        <div className="space-y-4 text-center">
          {actionError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 text-left">{actionError}</p>
          )}
          <div className="flex justify-center items-center gap-2 mb-4">
            <span className="font-bold text-green-600 text-xl">{actionAccount?.username}</span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">Amount <span className="text-red-500">*</span></span>
              <TextInput
                type="number"
                className="w-48 text-center"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
