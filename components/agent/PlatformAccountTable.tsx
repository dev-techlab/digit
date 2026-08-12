import { useState, useEffect, useCallback } from 'react';
import {
  api,
  Btn,
  Card,
  Field,
  fmtDateTime,
  fmtMoney,
  Modal,
  Select,
  TextInput,
} from '@/components/agent/ui';
import { DataTable } from '@/components/ui/DataTable';
import { FileText } from 'lucide-react';

interface PlatformAccountRow {
  id: string;
  platformName: string;
  gameUsername: string;
  memberUsername: string;
  notes: string;
  createdAt: string;
  balance: string;
  state: 'online' | 'offline' | 'locked';
}

export function PlatformAccountTable({ platformId }: { platformId: string }) {
  const [rows, setRows] = useState<PlatformAccountRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<PlatformAccountRow | null>(null);
  const [editForm, setEditForm] = useState({ gameUsername: '', notes: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Purchase / Redeem Modal State
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [actionAccount, setActionAccount] = useState<PlatformAccountRow | null>(null);
  const [amount, setAmount] = useState('0.00');
  const [actionSaving, setActionSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!platformId) return;
    setLoading(true);
    const query = new URLSearchParams({ platformId });
    if (search) query.set('search', search);
    if (stateFilter) query.set('state', stateFilter);

    api<{ accounts: PlatformAccountRow[] }>(`/api/agent/platform-accounts?${query.toString()}`)
      .then((d) => setRows(d.accounts))
      .finally(() => setLoading(false));
  }, [platformId, search, stateFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const performAction = async (accountId: string, action: string) => {
    try {
      await api('/api/agent/platform-accounts/action', {
        method: 'POST',
        body: JSON.stringify({ accountId, action }),
      });
      load(); // Reload after action
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const openEditModal = (account: PlatformAccountRow) => {
    setEditAccount(account);
    setEditForm({
      gameUsername: account.gameUsername || '',
      notes: account.notes || '',
    });
    setEditError(null);
    setEditModalOpen(true);
  };

  const openPurchaseModal = (account: PlatformAccountRow) => {
    setActionAccount(account);
    setAmount('0.00');
    setActionError(null);
    setPurchaseModalOpen(true);
  };

  const openRedeemModal = (account: PlatformAccountRow) => {
    setActionAccount(account);
    setAmount('0.00');
    setActionError(null);
    setRedeemModalOpen(true);
  };

  const submitActionAmount = async (action: 'purchase' | 'redeem') => {
    if (!actionAccount) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setActionError('Please enter a valid amount greater than 0');
      return;
    }
    setActionSaving(true);
    setActionError(null);
    try {
      await api('/api/agent/platform-accounts/action', {
        method: 'POST',
        body: JSON.stringify({ accountId: actionAccount.id, action, amount: val }),
      });
      setPurchaseModalOpen(false);
      setRedeemModalOpen(false);
      load();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setActionSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editAccount) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await api('/api/agent/platform-accounts', {
        method: 'PUT',
        body: JSON.stringify({
          id: editAccount.id,
          gameUsername: editForm.gameUsername,
          notes: editForm.notes,
        }),
      });
      setEditModalOpen(false);
      load();
    } catch (e) {
      setEditError((e as Error).message);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <Card className="mt-6 p-4">
      <div className="mb-4 flex justify-end gap-2">
        <Select
          className="h-9 w-32 py-0 text-sm"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
        >
          <option value="">All States</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="locked">Locked</option>
        </Select>
        <TextInput
          placeholder="Account # or Username"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64 text-sm"
        />
        <button
          className="rounded-md border border-slate-300 bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
          onClick={load}
          disabled={loading}
        >
          {loading ? '...' : 'Search'}
        </button>
      </div>

      <DataTable
        data={rows}
        rowKey={(r) => r.id}
        columns={[
          {
            header: 'Platform',
            accessorKey: 'platformName',
            cell: (r) => <span className="text-slate-600">{r.platformName || 'River'}</span>,
          },
          {
            header: 'Account #',
            accessorKey: 'gameUsername',
            cell: (r) => (
              <span className="rounded bg-slate-800 px-2 py-1 text-xs font-bold text-white">
                {r.gameUsername}
              </span>
            ),
          },
          {
            header: 'Username/Notes',
            accessorKey: 'notes',
            cell: (r) => (
              <div className="flex items-center gap-1">
                <FileText size={12} className="text-slate-400" /> {r.notes || r.memberUsername}
              </div>
            ),
          },
          {
            header: 'Created',
            accessorKey: 'createdAt',
            cell: (r) => <span className="text-xs text-slate-500">{fmtDateTime(r.createdAt)}</span>,
          },
          {
            header: 'Balance',
            accessorKey: 'balance',
            cell: (r) => (
              <span className="text-xs font-semibold text-pink-500">
                {fmtMoney(r.balance)} <span className="font-normal text-slate-400">/ 0.00</span>
              </span>
            ),
          },
          {
            header: 'State',
            accessorKey: 'state',
            cell: (r) => (
              <span
                className={`rounded px-2 py-0.5 text-xs font-bold uppercase text-white ${r.state === 'online' ? 'bg-green-600' : r.state === 'locked' ? 'bg-orange-500' : 'bg-red-700'}`}
              >
                {r.state}
              </span>
            ),
          },
          {
            header: 'Purchase / Redeem',
            cell: (r) => (
              <div className="flex items-center">
                <button
                  className="rounded-l bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-blue-700"
                  onClick={() => openPurchaseModal(r)}
                >
                  Purchase
                </button>
                <button
                  className="rounded-r bg-red-600 px-2 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-red-700"
                  onClick={() => openRedeemModal(r)}
                >
                  Redeem
                </button>
              </div>
            ),
          },
          {
            header: 'Reverse',
            cell: (r) => (
              <button
                className="rounded bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-300"
                onClick={() => performAction(r.id, 'reverse')}
              >
                Reverse
              </button>
            ),
          },
          {
            header: 'Lock',
            cell: (r) => (
              <button
                className={`${r.state === 'locked' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'} rounded p-1 text-white shadow-sm`}
                title={r.state === 'locked' ? 'Unlock' : 'Lock'}
                onClick={() => performAction(r.id, r.state === 'locked' ? 'unlock' : 'lock')}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                  <line x1="12" y1="2" x2="12" y2="12"></line>
                </svg>
              </button>
            ),
          },
          {
            header: 'PWD',
            cell: (r) => (
              <button
                className="rounded bg-slate-100 p-1 text-slate-500 shadow-sm hover:bg-slate-200"
                title="Reset Password"
                onClick={() => performAction(r.id, 'reset_pwd')}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 12V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-9"></path>
                  <path d="M2 12a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"></path>
                  <circle cx="6" cy="15" r="1"></circle>
                </svg>
              </button>
            ),
          },
          {
            header: 'Close',
            cell: (r) => (
              <button
                className="rounded bg-orange-500 px-2 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-orange-600"
                onClick={() => openEditModal(r)}
              >
                Close
              </button>
            ),
          },
          {
            header: 'Hist',
            cell: (r) => (
              <button
                className="p-1 text-slate-600 hover:text-slate-800"
                title="History"
                onClick={() => performAction(r.id, 'hist')}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </button>
            ),
          },
          {
            header: 'Logs',
            cell: (r) => (
              <button
                className="p-1 text-slate-600 hover:text-slate-800"
                title="Logs"
                onClick={() => performAction(r.id, 'logs')}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
              </button>
            ),
          },
        ]}
      />

      <Modal
        title="Edit Platform Account"
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={saveEdit} disabled={editSaving}>
              {editSaving ? 'Saving...' : 'Save'}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          {editError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{editError}</p>
          )}
          <Field label="Game Username" required>
            <TextInput
              value={editForm.gameUsername}
              onChange={(e) => setEditForm({ ...editForm, gameUsername: e.target.value })}
            />
          </Field>
          <Field label="Notes / Player Nickname">
            <TextInput
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        title="Purchase"
        open={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        footer={
          <>
            <Btn
              onClick={() => submitActionAmount('purchase')}
              disabled={actionSaving}
              className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            >
              {actionSaving ? 'Processing...' : 'Purchase'}
            </Btn>
            <Btn variant="ghost" onClick={() => setPurchaseModalOpen(false)}>
              Cancel
            </Btn>
          </>
        }
      >
        <div className="space-y-4 text-center">
          {actionError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-left text-sm text-red-500">
              {actionError}
            </p>
          )}
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="text-sm text-slate-500">Account #</span>
            <span className="text-lg font-bold text-green-600">{actionAccount?.gameUsername}</span>
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

            <div className="mt-4 text-xs text-slate-500">Quick amounts:</div>
            <div className="mt-1 flex max-w-[250px] flex-wrap justify-center gap-2">
              {[5, 10, 20, 50, 100].map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount((parseFloat(amount || '0') + val).toFixed(2))}
                  className="rounded border border-slate-300 bg-slate-100 px-3 py-1 text-sm text-slate-700 shadow-sm hover:bg-slate-200"
                >
                  +${val}
                </button>
              ))}
              <button
                onClick={() => setAmount('0.00')}
                className="rounded bg-orange-500 px-3 py-1 text-sm text-white shadow-sm hover:bg-orange-600"
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
            <Btn
              onClick={() => submitActionAmount('redeem')}
              disabled={actionSaving}
              className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            >
              {actionSaving ? 'Processing...' : 'Redeem'}
            </Btn>
            <Btn variant="ghost" onClick={() => setRedeemModalOpen(false)}>
              Cancel
            </Btn>
          </>
        }
      >
        <div className="space-y-4 text-center">
          {actionError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-left text-sm text-red-500">
              {actionError}
            </p>
          )}
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="text-xl font-bold text-green-600">{actionAccount?.gameUsername}</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">
                Amount <span className="text-red-500">*</span>
              </span>
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
    </Card>
  );
}
