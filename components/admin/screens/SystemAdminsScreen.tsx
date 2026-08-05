'use client';

import { useCallback, useEffect, useState } from 'react';
import { Edit, ShieldCheck, ShieldAlert, Trash2, Plus } from 'lucide-react';
import { api, Btn, Card, Field, fmtDateTime, Modal, TextInput } from '@/components/agent/ui';
import { DataTable } from '@/components/ui/DataTable';
import { useAdminPanel } from '@/components/admin/AdminShell';
import { useDataTable } from '@/hooks/useDataTable';
import { useActionModal } from '@/hooks/useActionModal';

interface SystemAdminRow {
  id: string;
  username: string;
  email: string;
  status: 'active' | 'suspended' | 'invited';
  lastLoginAt: string | null;
  createdAt: string;
}

const emptyForm = () => ({ username: '', email: '', password: '' });

export function SystemAdminsScreen() {
  const { me } = useAdminPanel();
  const table = useDataTable<SystemAdminRow>('/api/admin/system-admins', 'admins');

  const createModal = useActionModal<null>();
  const [form, setForm] = useState(emptyForm());

  const editModal = useActionModal<SystemAdminRow>();
  const [editForm, setEditForm] = useState({ email: '', password: '', status: 'active' });

  const deleteModal = useActionModal<SystemAdminRow>();

  // SWR fetches automatically; no manual useEffect needed

  const create = async () => {
    createModal.setErr(null);
    if (!form.username.trim() || !form.email.trim() || !form.password) {
      createModal.setErr('Username, email, and password are required.');
      return;
    }
    createModal.setBusy(true);
    try {
      await api('/api/admin/system-admins', {
        method: 'POST',
        body: JSON.stringify({ ...form }),
      });
      setForm(emptyForm());
      createModal.closeModal();
      table.setPage(1);
      void table.load(1, table.search);
    } catch (e) {
      createModal.setErr(e instanceof Error ? e.message : 'Failed to create admin.');
    } finally {
      createModal.setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!editModal.item) return;
    editModal.setErr(null);
    editModal.setBusy(true);
    try {
      await api(`/api/admin/system-admins/${editModal.item.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          email: editForm.email,
          status: editForm.status,
          ...(editForm.password ? { password: editForm.password } : {}),
        }),
      });
      void table.reload();
      editModal.closeModal();
    } catch (e) {
      editModal.setErr(e instanceof Error ? e.message : 'Failed to update admin.');
    } finally {
      editModal.setBusy(false);
    }
  };

  const removeAdmin = async () => {
    if (!deleteModal.item) return;
    deleteModal.setBusy(true);
    try {
      await api(`/api/admin/system-admins/${deleteModal.item.id}`, { method: 'DELETE' });
      deleteModal.closeModal();
      void table.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete admin.');
    } finally {
      deleteModal.setBusy(false);
    }
  };

  if (!me.isSuperAdmin) {
    return (
      <div className="p-8 text-center">
        <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-red-400" />
        <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
        <p className="mt-2 text-slate-500">
          You do not have permission to view or manage System Admins.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <Btn
          variant="success"
          className="mb-4"
          onClick={() => {
            setForm(emptyForm());
            createModal.openModal(null);
          }}
        >
          <Plus size={16} /> Add System Admin
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
          columns={[
            {
              header: 'Username',
              accessorKey: 'username',
              cell: (r) => (
                <div className="flex items-center gap-2 font-medium text-slate-700">
                  <ShieldCheck size={16} className="text-indigo-500" />
                  {r.username}
                  {r.id === me.adminId && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                      You
                    </span>
                  )}
                </div>
              ),
            },
            { header: 'Email', accessorKey: 'email' },
            {
              header: 'Status',
              accessorKey: 'status',
              cell: (r) => (
                <span
                  className={
                    r.status === 'active'
                      ? 'rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-600'
                      : r.status === 'invited'
                        ? 'rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600'
                        : 'rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-500'
                  }
                >
                  {r.status === 'active'
                    ? 'Active'
                    : r.status === 'invited'
                      ? 'Invited'
                      : 'Suspended'}
                </span>
              ),
            },
            {
              header: 'Last Login',
              accessorKey: 'lastLoginAt',
              cell: (r) => (
                <span className="text-sm text-slate-500">{fmtDateTime(r.lastLoginAt)}</span>
              ),
            },
            {
              header: 'Created',
              accessorKey: 'createdAt',
              cell: (r) => (
                <span className="text-sm text-slate-500">{fmtDateTime(r.createdAt)}</span>
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
                    className="px-2 text-xs"
                    disabled={editModal.busy && editModal.item?.id === r.id}
                    onClick={() => {
                      setEditForm({ email: r.email, password: '', status: r.status });
                      editModal.openModal(r);
                    }}
                  >
                    <Edit size={16} className="text-blue-500" />
                  </Btn>
                  {r.id !== me.adminId && (
                    <Btn
                      variant="ghost"
                      className="px-2 text-xs"
                      disabled={deleteModal.busy && deleteModal.item?.id === r.id}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Are you sure you want to permanently delete admin ${r.username}?`
                          )
                        ) {
                          deleteModal.openModal(r);
                          void removeAdmin();
                        }
                      }}
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </Btn>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Add Modal */}
      <Modal
        title="Add System Admin"
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
          <Field label="Username" required>
            <TextInput
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="e.g. jdoe_admin"
            />
          </Field>
          <Field label="Email" required>
            <TextInput
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Password" required>
            <TextInput
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit System Admin"
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
          <div className="mb-4">
            <label className="text-sm font-medium text-slate-700">Username</label>
            <div className="mt-1 font-semibold text-slate-900">{editModal.item?.username}</div>
          </div>
          <Field label="Email" required>
            <TextInput
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
          </Field>
          <Field label="Status">
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="invited">Invited</option>
            </select>
          </Field>
          <Field label="New Password">
            <TextInput
              type="password"
              placeholder="Leave blank to keep unchanged"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
