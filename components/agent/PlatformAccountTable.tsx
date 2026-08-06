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
            header: 'Action',
            cell: (r) => (
              <div className="flex flex-wrap gap-1.5 justify-center max-w-[280px]">
                <button className="bg-yellow-500 hover:bg-yellow-600 text-white text-[11px] px-2.5 py-1 rounded shadow-sm font-semibold" onClick={() => performAction(r.id, 'purchase')}>Set Score</button>
                <button className="bg-yellow-500 hover:bg-yellow-600 text-white text-[11px] px-2.5 py-1 rounded shadow-sm font-semibold" onClick={() => performAction(r.id, 'hist')}>Score Log</button>
                <button className="bg-yellow-500 hover:bg-yellow-600 text-white text-[11px] px-2.5 py-1 rounded shadow-sm font-semibold" onClick={() => openEditModal(r)}>Edit</button>
                <button className="bg-yellow-500 hover:bg-yellow-600 text-white text-[11px] px-2.5 py-1 rounded shadow-sm font-semibold" onClick={() => performAction(r.id, 'report')}>Report</button>
                <button className="bg-yellow-500 hover:bg-yellow-600 text-white text-[11px] px-2.5 py-1 rounded shadow-sm font-semibold" onClick={() => performAction(r.id, 'logs')}>Game Log</button>
                <button className="bg-yellow-500 hover:bg-yellow-600 text-white text-[11px] px-2.5 py-1 rounded shadow-sm font-semibold" onClick={() => performAction(r.id, r.state === 'locked' ? 'unlock' : 'lock')}>{r.state === 'locked' ? 'Enable' : 'Disable'}</button>
              </div>
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
    </Card>
  );
}
