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
  createdAt: string;
  goldCoin: string | null;
  onlineSc: string | null;
}

const emptyForm = () => ({
  username: '',
  password: '',
  nickname: '',
  email: '',
  phone: '',
});

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
    nickname: '',
    email: '',
    phone: '',
  });

  const deleteModal = useActionModal<UserRow>();

  const create = async () => {
    createModal.setErr(null);
    createModal.setBusy(true);
    try {
      const res = await api<{ user: { username: string; password: string } }>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(form),
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
      await api('/api/admin/users', {
        method: 'PUT',
        body: JSON.stringify({
          id: editModal.item.id,
          nickname: editForm.nickname,
          email: editForm.email,
          phone: editForm.phone,
        }),
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
                <div className="flex items-center gap-2">
                  <Btn
                    variant="ghost"
                    className="px-1 text-xs"
                    disabled={editModal.busy && editModal.item?.id === r.id}
                    onClick={() => {
                      setEditForm({
                        nickname: r.nickname ?? '',
                        email: r.email ?? '',
                        phone: r.phone ?? '',
                      });
                      editModal.openModal(r);
                    }}
                  >
                    <Edit size={14} />
                  </Btn>
                  <Btn
                    variant={r.status === 'active' ? 'danger' : 'success'}
                    className="px-3 py-1.5 text-xs"
                    disabled={busyId === r.id}
                    onClick={() => void toggleStatus(r)}
                  >
                    {r.status === 'active' ? 'Block' : 'Unblock'}
                  </Btn>
                  <Btn
                    variant="danger"
                    className="px-3 py-1.5 text-xs ml-1 bg-red-600 hover:bg-red-700"
                    disabled={busyId === r.id || (deleteModal.busy && deleteModal.item?.id === r.id)}
                    onClick={() => deleteModal.openModal(r)}
                  >
                    Delete
                  </Btn>
                </div>
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
    </div>
  );
}
