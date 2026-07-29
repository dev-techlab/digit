'use client';

import { useCallback, useEffect, useState } from 'react';
import { Edit, ShieldCheck, ShieldAlert, Trash2, Plus } from 'lucide-react';
import {
  api,
  Btn,
  Card,
  Field,
  fmtDateTime,
  Modal,
  TextInput,
} from '@/components/agent/ui';
import { DataTable } from '@/components/ui/DataTable';
import { useAdminPanel } from '@/components/admin/AdminShell';

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
  const [rows, setRows] = useState<SystemAdminRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<SystemAdminRow | null>(null);
  const [editForm, setEditForm] = useState({ email: '', password: '', status: 'active' });
  const [editBusy, setEditBusy] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(
    (p = page, q = search) =>
      api<{ admins: SystemAdminRow[]; total: number }>(
        `/api/admin/system-admins?page=${p}&pageSize=20&search=${encodeURIComponent(q)}`
      )
        .then((d) => {
          setRows(d.admins);
          setTotal(d.total);
        })
        .finally(() => setLoading(false)),
    [page, search]
  );

  useEffect(() => {
    void load(1, '');
  }, []);

  const create = async () => {
    setErr(null);
    if (!form.username.trim() || !form.email.trim() || !form.password) {
      setErr('Username, email, and password are required.');
      return;
    }
    setSaving(true);
    try {
      await api('/api/admin/system-admins', {
        method: 'POST',
        body: JSON.stringify({ ...form }),
      });
      setForm(emptyForm());
      setOpen(false);
      void load(1, '');
      setPage(1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create admin.');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editRow) return;
    setEditErr(null);
    setEditBusy(true);
    try {
      await api(`/api/admin/system-admins/${editRow.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          email: editForm.email,
          status: editForm.status,
          ...(editForm.password ? { password: editForm.password } : {}),
        }),
      });
      void load(page, search);
      setEditOpen(false);
    } catch (e) {
      setEditErr(e instanceof Error ? e.message : 'Failed to update admin.');
    } finally {
      setEditBusy(false);
    }
  };

  const removeAdmin = async () => {
    if (!deleteId) return;
    setDeleteBusy(true);
    try {
      await api(`/api/admin/system-admins/${deleteId}`, { method: 'DELETE' });
      setDeleteId(null);
      void load(page, search);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete admin.');
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!me.isSuperAdmin) {
    return (
      <div className="p-8 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 mt-2">You do not have permission to view or manage System Admins.</p>
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
            setErr(null);
            setForm(emptyForm());
            setOpen(true);
          }}
        >
          <Plus size={16} /> Add System Admin
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
              )
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
                  {r.status === 'active' ? 'Active' : r.status === 'invited' ? 'Invited' : 'Suspended'}
                </span>
              )
            },
            {
              header: 'Last Login',
              accessorKey: 'lastLoginAt',
              cell: (r) => <span className="text-sm text-slate-500">{fmtDateTime(r.lastLoginAt)}</span>
            },
            {
              header: 'Created',
              accessorKey: 'createdAt',
              cell: (r) => <span className="text-sm text-slate-500">{fmtDateTime(r.createdAt)}</span>
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
                    disabled={editBusy && editRow?.id === r.id}
                    onClick={() => {
                      setEditRow(r);
                      setEditForm({ email: r.email, password: '', status: r.status });
                      setEditErr(null);
                      setEditOpen(true);
                    }}
                  >
                    <Edit size={16} className="text-blue-500" />
                  </Btn>
                  {r.id !== me.adminId && (
                    <Btn
                      variant="ghost"
                      className="px-2 text-xs"
                      disabled={deleteBusy && deleteId === r.id}
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to permanently delete admin ${r.username}?`)) {
                          setDeleteId(r.id);
                          void removeAdmin();
                        }
                      }}
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </Btn>
                  )}
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* Add Modal */}
      <Modal
        title="Add System Admin"
        open={open}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={create} disabled={saving}>
              {saving ? 'Creating…' : 'Confirm'}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{err}</p>}
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
        open={editOpen}
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={saveEdit} disabled={editBusy}>
              {editBusy ? 'Saving…' : 'Save'}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          {editErr && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{editErr}</p>}
          <div className="mb-4">
            <label className="text-sm font-medium text-slate-700">Username</label>
            <div className="mt-1 text-slate-900 font-semibold">{editRow?.username}</div>
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
