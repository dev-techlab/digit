'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, CreditCard, DollarSign, Activity, Users, ArrowUpRight, ArrowDownRight, Settings } from 'lucide-react';
import Link from 'next/link';
import { api, Card, Btn, Field, TextInput, fmtMoney } from '@/components/agent/ui';

interface AgentDetails {
  id: string;
  username: string;
  nickname: string | null;
  email: string | null;
  onlineBalance: string;
  status: string;
  totalUsers: number;
  totalTransactions: number;
}

export function AgentDetailsScreen({ agentId }: { agentId: string }) {
  const [agent, setAgent] = useState<AgentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'deposit' | 'withdraw' | 'withdrawals'>('dashboard');
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    api<{ agent: AgentDetails }>(`/api/admin/agents/${agentId}`)
      .then((data) => {
        setAgent(data.agent);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [agentId]);

  useEffect(() => {
    if (activeTab === 'withdrawals') {
      api<{ transactions: any[] }>(`/api/admin/agents/${agentId}/transactions?type=withdraw`)
        .then(data => setWithdrawals(data.transactions))
        .catch(console.error);
    }
  }, [activeTab, agentId]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading agent details...</div>;
  if (!agent) return <div className="p-8 text-center text-red-500">Agent not found.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <Link href="/admin/agents" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            {agent.username}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${agent.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {agent.status}
            </span>
          </h1>
          <p className="text-sm text-slate-500">{agent.email || 'No email provided'}</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: Activity },
          { id: 'deposit', label: 'Deposit', icon: ArrowDownRight },
          { id: 'withdraw', label: 'Withdraw', icon: ArrowUpRight },
          { id: 'withdrawals', label: 'Withdrawal List', icon: Activity },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Current Balance</p>
                  <h3 className="text-3xl font-bold mt-1">{fmtMoney(agent.onlineBalance)}</h3>
                </div>
                <div className="p-3 bg-white/20 rounded-xl">
                  <DollarSign size={24} />
                </div>
              </div>
            </Card>
            
            <Card className="bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm font-medium">Total Users</p>
                  <h3 className="text-2xl font-bold text-slate-800 mt-1">{agent.totalUsers?.toLocaleString() ?? 0}</h3>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-500 rounded-xl">
                  <Users size={20} />
                </div>
              </div>
            </Card>

            <Card className="bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-sm font-medium">Total Transactions</p>
                  <h3 className="text-2xl font-bold text-slate-800 mt-1">{agent.totalTransactions?.toLocaleString() ?? 0}</h3>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl">
                  <CreditCard size={20} />
                </div>
              </div>
            </Card>
          </div>

          {/* Menus Grid */}
          <h2 className="text-lg font-bold text-slate-800 pt-4">Dashboard Menus</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Sub Agents', desc: 'Manage agent hierarchy', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
              { title: 'Transactions', desc: 'View full history', icon: Activity, color: 'text-purple-500', bg: 'bg-purple-50' },
              { title: 'Game Settings', desc: 'Manage platform access', icon: Settings, color: 'text-amber-500', bg: 'bg-amber-50' },
              { title: 'Reports', desc: 'Financial summaries', icon: CreditCard, color: 'text-rose-500', bg: 'bg-rose-50' },
            ].map((menu, i) => (
              <Card key={i} className="group cursor-pointer hover:shadow-lg transition-all hover:border-blue-200">
                <div className="flex flex-col items-center text-center space-y-3 p-2">
                  <div className={`p-4 rounded-2xl ${menu.bg} ${menu.color} group-hover:scale-110 transition-transform`}>
                    <menu.icon size={28} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">{menu.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{menu.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'deposit' && (
        <Card className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <ArrowDownRight size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Deposit Funds</h2>
              <p className="text-sm text-slate-500">Add balance to {agent.username}&apos;s account</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <Field label="Amount" required>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500">$</span>
                </div>
                <TextInput type="number" placeholder="0.00" className="pl-8 text-lg font-medium" />
              </div>
            </Field>
            
            <Field label="Payment Method">
              <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-shadow">
                <option>Bank Transfer</option>
                <option>Crypto (USDT)</option>
                <option>Manual Adjustment</option>
              </select>
            </Field>
            
            <Field label="Remark / Reference">
              <TextInput placeholder="Transaction ID or notes" />
            </Field>

            <div className="pt-4">
              <Btn className="w-full py-3 text-base">Confirm Deposit</Btn>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'withdraw' && (
        <Card className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300 border-orange-100">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
              <ArrowUpRight size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Withdraw Funds</h2>
              <p className="text-sm text-slate-500">Deduct balance from {agent.username}&apos;s account</p>
            </div>
          </div>
          
          <div className="mb-6 p-4 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-100">
            <span className="text-sm text-slate-600 font-medium">Available Balance</span>
            <span className="text-lg font-bold text-slate-800">{fmtMoney(agent.onlineBalance)}</span>
          </div>
          
          <div className="space-y-4">
            <Field label="Amount" required>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500">$</span>
                </div>
                <TextInput type="number" placeholder="0.00" className="pl-8 text-lg font-medium" />
              </div>
            </Field>
            
            <Field label="Reason">
              <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-shadow">
                <option>Agent Request</option>
                <option>Correction</option>
                <option>Penalty</option>
              </select>
            </Field>
            
            <Field label="Remark">
              <TextInput placeholder="Additional notes" />
            </Field>

            <div className="pt-4">
              <Btn variant="danger" className="w-full py-3 text-base bg-orange-500 hover:bg-orange-600 text-white border-0">
                Confirm Withdrawal
              </Btn>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'withdrawals' && (
        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Withdrawal List</h2>
              <p className="text-sm text-slate-500">History of agent withdrawals</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 border-y border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Order No</th>
                  <th className="px-4 py-3 font-medium">Requested Amount</th>
                  <th className="px-4 py-3 font-medium">Commission %</th>
                  <th className="px-4 py-3 font-medium">Commission Amount</th>
                  <th className="px-4 py-3 font-medium">Net Payable Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No withdrawals found.
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{w.id.slice(0, 16).toUpperCase()}</td>
                      <td className="px-4 py-3">{fmtMoney(w.amount)}</td>
                      <td className="px-4 py-3">{w.commissionPer ? `${w.commissionPer}%` : '-'}</td>
                      <td className="px-4 py-3 text-amber-500 font-medium">{fmtMoney(w.fee)}</td>
                      <td className="px-4 py-3 text-green-600 font-semibold">{w.netAmount != null ? fmtMoney(w.netAmount) : '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                          w.status === 'completed' ? 'bg-green-100 text-green-700' :
                          w.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {w.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{new Date(w.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
