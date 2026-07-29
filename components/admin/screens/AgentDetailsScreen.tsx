'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
  Activity,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'deposit' | 'withdraw' | 'withdrawals'>(
    'dashboard'
  );
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
        .then((data) => setWithdrawals(data.transactions))
        .catch(console.error);
    }
  }, [activeTab, agentId]);

  if (loading)
    return <div className="p-8 text-center text-slate-500">Loading agent details...</div>;
  if (!agent) return <div className="p-8 text-center text-red-500">Agent not found.</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <Link
          href="/admin/agents"
          className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            {agent.username}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${agent.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
            >
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
            className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6 duration-300">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-100">Current Balance</p>
                  <h3 className="mt-1 text-3xl font-bold">{fmtMoney(agent.onlineBalance)}</h3>
                </div>
                <div className="rounded-xl bg-white/20 p-3">
                  <DollarSign size={24} />
                </div>
              </div>
            </Card>

            <Card className="bg-white transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Users</p>
                  <h3 className="mt-1 text-2xl font-bold text-slate-800">
                    {agent.totalUsers?.toLocaleString() ?? 0}
                  </h3>
                </div>
                <div className="rounded-xl bg-indigo-50 p-3 text-indigo-500">
                  <Users size={20} />
                </div>
              </div>
            </Card>

            <Card className="bg-white transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Transactions</p>
                  <h3 className="mt-1 text-2xl font-bold text-slate-800">
                    {agent.totalTransactions?.toLocaleString() ?? 0}
                  </h3>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-500">
                  <CreditCard size={20} />
                </div>
              </div>
            </Card>
          </div>

          {/* Menus Grid */}
          <h2 className="pt-4 text-lg font-bold text-slate-800">Dashboard Menus</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Sub Agents',
                desc: 'Manage agent hierarchy',
                icon: Users,
                color: 'text-blue-500',
                bg: 'bg-blue-50',
              },
              {
                title: 'Transactions',
                desc: 'View full history',
                icon: Activity,
                color: 'text-purple-500',
                bg: 'bg-purple-50',
              },
              {
                title: 'Game Settings',
                desc: 'Manage platform access',
                icon: Settings,
                color: 'text-amber-500',
                bg: 'bg-amber-50',
              },
              {
                title: 'Reports',
                desc: 'Financial summaries',
                icon: CreditCard,
                color: 'text-rose-500',
                bg: 'bg-rose-50',
              },
            ].map((menu, i) => (
              <Card
                key={i}
                className="group cursor-pointer transition-all hover:border-blue-200 hover:shadow-lg"
              >
                <div className="flex flex-col items-center space-y-3 p-2 text-center">
                  <div
                    className={`rounded-2xl p-4 ${menu.bg} ${menu.color} transition-transform group-hover:scale-110`}
                  >
                    <menu.icon size={28} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">{menu.title}</h4>
                    <p className="mt-1 text-xs text-slate-500">{menu.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'deposit' && (
        <Card className="animate-in fade-in slide-in-from-bottom-2 mx-auto max-w-xl duration-300">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <ArrowDownRight size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Deposit Funds</h2>
              <p className="text-sm text-slate-500">
                Add balance to {agent.username}&apos;s account
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Field label="Amount" required>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-slate-500">$</span>
                </div>
                <TextInput type="number" placeholder="0.00" className="pl-8 text-lg font-medium" />
              </div>
            </Field>

            <Field label="Payment Method">
              <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-shadow focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
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
        <Card className="animate-in fade-in slide-in-from-bottom-2 mx-auto max-w-xl border-orange-100 duration-300">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
              <ArrowUpRight size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Withdraw Funds</h2>
              <p className="text-sm text-slate-500">
                Deduct balance from {agent.username}&apos;s account
              </p>
            </div>
          </div>

          <div className="mb-6 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4">
            <span className="text-sm font-medium text-slate-600">Available Balance</span>
            <span className="text-lg font-bold text-slate-800">
              {fmtMoney(agent.onlineBalance)}
            </span>
          </div>

          <div className="space-y-4">
            <Field label="Amount" required>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-slate-500">$</span>
                </div>
                <TextInput type="number" placeholder="0.00" className="pl-8 text-lg font-medium" />
              </div>
            </Field>

            <Field label="Reason">
              <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-shadow focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                <option>Agent Request</option>
                <option>Correction</option>
                <option>Penalty</option>
              </select>
            </Field>

            <Field label="Remark">
              <TextInput placeholder="Additional notes" />
            </Field>

            <div className="pt-4">
              <Btn
                variant="danger"
                className="w-full border-0 bg-orange-500 py-3 text-base text-white hover:bg-orange-600"
              >
                Confirm Withdrawal
              </Btn>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'withdrawals' && (
        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Withdrawal List</h2>
              <p className="text-sm text-slate-500">History of agent withdrawals</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
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
                    <tr key={w.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-xs">
                        {w.id.slice(0, 16).toUpperCase()}
                      </td>
                      <td className="px-4 py-3">{fmtMoney(w.amount)}</td>
                      <td className="px-4 py-3">{w.commissionPer ? `${w.commissionPer}%` : '-'}</td>
                      <td className="px-4 py-3 font-medium text-amber-500">{fmtMoney(w.fee)}</td>
                      <td className="px-4 py-3 font-semibold text-green-600">
                        {w.netAmount != null ? fmtMoney(w.netAmount) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium capitalize ${
                            w.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : w.status === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
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
