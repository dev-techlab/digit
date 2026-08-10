import { useState, useEffect, useCallback } from 'react';
import { api, Btn, Card, Field, fmtDateTime, fmtMoney, Modal, Select, TextInput } from '@/components/agent/ui';
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
        body: JSON.stringify({ accountId, action })
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
        body: JSON.stringify({ accountId: actionAccount.id, action, amount: val })
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
        })
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
      <div className="flex justify-end mb-4 gap-2">
        <Select className="w-32 h-9 text-sm py-0" value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
          <option value="">All States</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="locked">Locked</option>
        </Select>
        <TextInput 
          placeholder="Account # or Username" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 h-9 text-sm"
        />
        <button 
          className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-4 py-1.5 rounded-md text-sm font-medium disabled:opacity-50"
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
          { header: 'Platform', accessorKey: 'platformName', cell: (r) => <span className="text-slate-600">{r.platformName || 'River'}</span> },
          { header: 'Account #', accessorKey: 'gameUsername', cell: (r) => <span className="font-bold bg-slate-800 text-white px-2 py-1 rounded text-xs">{r.gameUsername}</span> },
          { header: 'Username/Notes', accessorKey: 'notes', cell: (r) => <div className="flex items-center gap-1"><FileText size={12} className="text-slate-400"/> {r.notes || r.memberUsername}</div> },
          { header: 'Created', accessorKey: 'createdAt', cell: (r) => <span className="text-slate-500 text-xs">{fmtDateTime(r.createdAt)}</span> },
          { header: 'Balance', accessorKey: 'balance', cell: (r) => <span className="text-pink-500 font-semibold text-xs">{fmtMoney(r.balance)} <span className="text-slate-400 font-normal">/ 0.00</span></span> },
          { 
            header: 'State', 
            accessorKey: 'state', 
            cell: (r) => <span className={`px-2 py-0.5 rounded text-xs uppercase font-bold text-white ${r.state === 'online' ? 'bg-green-600' : (r.state === 'locked' ? 'bg-orange-500' : 'bg-red-700')}`}>{r.state}</span>
          },
          {
            header: 'Purchase / Redeem',
            cell: (r) => (
              <div className="flex items-center">
                <button 
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] px-2 py-1 rounded-l shadow-sm font-semibold" 
                  onClick={() => openPurchaseModal(r)}>
                  Purchase
                </button>
                <button 
                  className="bg-red-600 hover:bg-red-700 text-white text-[11px] px-2 py-1 rounded-r shadow-sm font-semibold" 
                  onClick={() => openRedeemModal(r)}>
                  Redeem
                </button>
              </div>
            )
          },
          {
            header: 'Reverse',
            cell: (r) => (
              <button 
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] px-2 py-1 rounded shadow-sm font-semibold" 
                onClick={() => performAction(r.id, 'reverse')}>
                Reverse
              </button>
            )
          },
          {
            header: 'Lock',
            cell: (r) => (
              <button 
                className={`${r.state === 'locked' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'} text-white p-1 rounded shadow-sm`} 
                title={r.state === 'locked' ? 'Unlock' : 'Lock'}
                onClick={() => performAction(r.id, r.state === 'locked' ? 'unlock' : 'lock')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
              </button>
            )
          },
          {
            header: 'PWD',
            cell: (r) => (
              <button 
                className="bg-slate-100 hover:bg-slate-200 text-slate-500 p-1 rounded shadow-sm" 
                title="Reset Password"
                onClick={() => performAction(r.id, 'reset_pwd')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-9"></path><path d="M2 12a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"></path><circle cx="6" cy="15" r="1"></circle></svg>
              </button>
            )
          },
          {
            header: 'Close',
            cell: (r) => (
              <button 
                className="bg-orange-500 hover:bg-orange-600 text-white text-[11px] px-2 py-1 rounded shadow-sm font-semibold" 
                onClick={() => openEditModal(r)}>
                Close
              </button>
            )
          },
          {
            header: 'Hist',
            cell: (r) => (
              <button 
                className="text-slate-600 hover:text-slate-800 p-1" 
                title="History"
                onClick={() => performAction(r.id, 'hist')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </button>
            )
          },
          {
            header: 'Logs',
            cell: (r) => (
              <button 
                className="text-slate-600 hover:text-slate-800 p-1" 
                title="Logs"
                onClick={() => performAction(r.id, 'logs')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              </button>
            )
          }
        ]}
      />

      <Modal
        title="Edit Platform Account"
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setEditModalOpen(false)}>Cancel</Btn>
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
            <Btn onClick={() => submitActionAmount('purchase')} disabled={actionSaving} className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600">
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
            <span className="font-bold text-green-600 text-lg">{actionAccount?.gameUsername}</span>
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
            <Btn onClick={() => submitActionAmount('redeem')} disabled={actionSaving} className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600">
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
            <span className="font-bold text-green-600 text-xl">{actionAccount?.gameUsername}</span>
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
    </Card>
  );
}
