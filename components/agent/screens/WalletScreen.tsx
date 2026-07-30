'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Wallet,
  Coins,
  Copy,
  Mail,
  Check,
  Info,
  Plus,
  HelpCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { api, Btn, Card, Field, fmtMoney, fmtDateTime, Modal, TextInput } from '../ui';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from '@/lib/cn';

interface LogRow {
  id: string;
  type: 'deposit' | 'withdraw' | 'transfer';
  method: string | null;
  amount: string;
  fee: string;
  commissionPer?: string;
  netAmount?: string | null;
  address: string | null;
  balanceBefore: string | null;
  balanceAfter: string | null;
  remark: string | null;
  counterparty: string | null;
  status: string;
  createdAt: string;
}

interface WalletData {
  store: {
    email: string | null;
    username: string;
    inviteCode: string;
    onlineBalance: string;
    tipsBalance: string;
    commissionPer: string;
  };
  settings: {
    storeName: string;
    dailyMaxRedeem: string;
    dailyMaxWithdraw: string;
    phoneBindRewardSc: string;
    logoUrl: string | null;
  } | null;
  logs: LogRow[];
  report: { day: string; deposit: string; depositFee: string; depositOrders: number }[];
}

const DEPOSIT_METHODS: { key: string; label: string; fee?: string }[] = [
  { key: 'paypal_pyusd', label: 'Paypal PYUSD' },
  { key: 'cashapp_usdc', label: 'Cashapp USDC' },
  { key: 'bitcoin', label: 'Bitcoin' },
  { key: 'bitcoin_lightning', label: 'Bitcoin Lightning Network' },
];
const WITHDRAW_METHODS = [
  { key: 'paypal_pyusd', label: 'Paypal PYUSD', fee: 'FEE UP TO $2' },
  { key: 'cashapp_usdc', label: 'Cashapp USDC', fee: 'FEE UP TO $2' },
  { key: 'bitcoin', label: 'Bitcoin' },
  { key: 'bank_card', label: 'Bank Card' },
  { key: 'ach', label: 'ACH Bank Transfer' },
] as { key: string; label: string; fee?: string }[];

const METHOD_LABEL: Record<string, string> = Object.fromEntries(
  [...DEPOSIT_METHODS, ...WITHDRAW_METHODS].map((m) => [m.key, m.label])
);

const LOG_TABS = [
  'Report',
  'Agent Deposit Log',
  'Agent Withdraw Log',
  'Agent Transfer Log',
  'Agent Transfer Request Log',
] as const;

const orderNo = (id: string) => id.replace(/-/g, '').slice(0, 16).toUpperCase();

function maskEmail(email: string | null) {
  if (!email) return '-';
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}***@${domain ?? ''}`;
}

const InfoDot = () => <Info size={13} className="ml-1 inline text-slate-300" />;

export function WalletScreen() {
  const [data, setData] = useState<WalletData | null>(null);
  const [fundTab, setFundTab] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit');
  const [logTab, setLogTab] = useState<(typeof LOG_TABS)[number]>('Report');
  const [method, setMethod] = useState('paypal_pyusd');
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [recipient, setRecipient] = useState('');
  const [transferRemark, setTransferRemark] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(1);

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 4);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [timezone, setTimezone] = useState('America/New_York');

  // Change Email — 2-step modal (verify current email → enter new email).
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailStep, setEmailStep] = useState<1 | 2>(1);
  const [emailCode, setEmailCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [fundError, setFundError] = useState('');
  const [reasonModal, setReasonModal] = useState<string | null>(null);

  const [form, setForm] = useState({
    storeName: '',
    dailyMaxRedeem: '5000',
    dailyMaxWithdraw: '500',
    phoneBindRewardSc: '3',
    logoUrl: '' as string | null,
  });

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const load = (f = fromDate, t = toDate, tz = timezone) => {
    const params = new URLSearchParams();
    if (f) params.append('from', f);
    if (t) params.append('to', t);
    if (tz) params.append('tz', tz === 'browser' ? Intl.DateTimeFormat().resolvedOptions().timeZone : tz);

    return api<WalletData>(`/api/agent/wallet?${params.toString()}`).then((d) => {
      setData(d);
      if (d.settings) {
        setForm({
          storeName: d.settings.storeName ?? '',
          dailyMaxRedeem: d.settings.dailyMaxRedeem,
          dailyMaxWithdraw: d.settings.dailyMaxWithdraw,
          phoneBindRewardSc: d.settings.phoneBindRewardSc,
          logoUrl: d.settings.logoUrl,
        });
      }
    });
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) return <p className="p-6 text-sm text-slate-400">Loading…</p>;

  const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL}?inviteCode=${data.store.inviteCode}`;

  const saveSettings = async () => {
    try {
      await api('/api/agent/wallet', { method: 'PUT', body: JSON.stringify(form) });
      flash(true, 'Settings saved');
    } catch (e) {
      flash(false, (e as Error).message);
    }
  };

  const pickLogo = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return flash(false, 'Logo must be at most 2MB');
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, logoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };
  const submitFund = async () => {
    setFundError('');
    try {
      const payload: Record<string, unknown> = { action: fundTab, amount: Number(amount) };
      if (fundTab === 'deposit') payload.method = method;
      if (fundTab === 'withdraw') {
        payload.method = method;
        payload.address = address;
      }
      if (fundTab === 'transfer') {
        payload.recipient = recipient;
        payload.remark = transferRemark;
      }
      await api('/api/agent/wallet', { method: 'POST', body: JSON.stringify(payload) });
      setAmount('');
      setAddress('');
      setRecipient('');
      setTransferRemark('');
      flash(true, `${fundTab[0].toUpperCase()}${fundTab.slice(1)} request submitted`);
      void load();
    } catch (e) {
      setFundError((e as Error).message);
    }
  };

  const cancelTx = async (id: string) => {
    await api('/api/agent/wallet', {
      method: 'POST',
      body: JSON.stringify({ action: 'cancel', id }),
    });
    void load();
  };

  const deposits = data.logs.filter((l) => l.type === 'deposit');
  const withdrawals = data.logs.filter((l) => l.type === 'withdraw');
  const transfers = data.logs.filter((l) => l.type === 'transfer');
  const transferRequests = transfers.filter((l) => l.status === 'pending');

  const statusChip = (st: string) => (
    <span
      className={cn(
        'rounded px-2 py-0.5 text-xs font-medium capitalize',
        st === 'completed' && 'bg-green-50 text-green-600',
        st === 'pending' && 'bg-amber-50 text-amber-600',
        (st === 'cancelled' || st === 'failed') && 'bg-slate-100 text-slate-500'
      )}
    >
      {st}
    </span>
  );

  const actionCell = (r: LogRow) => {
    if (r.status === 'pending') {
      return (
        <button className="text-red-500 hover:underline" onClick={() => void cancelTx(r.id)}>
          Cancel
        </button>
      );
    }
    if (r.remark && (r.status === 'failed' || r.status === 'cancelled')) {
      return (
        <button
          className="text-slate-400 transition hover:text-blue-500"
          onClick={() => setReasonModal(r.remark!)}
          title="View Reason"
        >
          <Eye size={15} />
        </button>
      );
    }
    return '-';
  };

  const dateFilter = (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600">Date Range</span>
        <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
          <span className="pl-3 text-slate-400">📅</span>
          <input
            type="date"
            className="px-2 py-1.5 text-sm text-slate-700 outline-none"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <span className="text-slate-300">-</span>
          <input
            type="date"
            className="px-2 py-1.5 text-sm text-slate-700 outline-none"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 outline-none focus:border-blue-500"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        >
          <option value="browser">Browser Local</option>
          <option value="America/New_York">US Eastern (ET)</option>
          <option value="America/Chicago">US Central (CT)</option>
          <option value="America/Denver">US Mountain (MT)</option>
          <option value="America/Los_Angeles">US Pacific (PT)</option>
          <option value="America/Anchorage">US Alaska (AKT)</option>
          <option value="Pacific/Honolulu">US Hawaii (HST)</option>
          <option value="Asia/Shanghai">China (UTC+8)</option>
        </select>
      </div>
      <span className="text-xs text-slate-400">Max query 31 days</span>
      <Btn onClick={() => void load()}>Search</Btn>
      <Btn
        variant="ghost"
        onClick={() => {
          const d = new Date();
          const t = d.toISOString().split('T')[0];
          d.setDate(d.getDate() - 4);
          const f = d.toISOString().split('T')[0];
          setFromDate(f);
          setToDate(t);
          setTimezone('America/New_York');
          void load(f, t, 'America/New_York');
        }}
      >
        Reset
      </Btn>
    </div>
  );

  const switchFundTab = (t: 'deposit' | 'withdraw' | 'transfer') => {
    setFundTab(t);
    setMethod('paypal_pyusd');
    setAmount('');
    setFundError('');
  };

  return (
    <div className="space-y-5">
      {msg && (
        <div
          className={cn(
            'rounded-lg border px-4 py-2 text-sm',
            msg.ok
              ? 'border-blue-200 bg-blue-50 text-blue-600'
              : 'border-red-200 bg-red-50 text-red-500'
          )}
        >
          {msg.text}
        </div>
      )}

      {/* Balances + identity */}
      <Card>
        <div className="flex flex-wrap gap-4">
          <div className="flex w-full items-center gap-4 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-5 text-white sm:w-64">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
              <Wallet size={22} />
            </span>
            <div>
              <p className="text-sm opacity-80">Online Balance</p>
              <p className="text-2xl font-bold">{fmtMoney(data.store.onlineBalance)}</p>
            </div>
          </div>
          <div className="relative flex w-full items-center gap-4 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 p-5 text-white sm:w-64">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
              <Coins size={22} />
            </span>
            <div>
              <p className="text-sm opacity-80">Tips</p>
              <p className="text-2xl font-bold">{fmtMoney(data.store.tipsBalance)}</p>
            </div>
            <button
              onClick={async () => {
                await api('/api/agent/wallet', {
                  method: 'POST',
                  body: JSON.stringify({ action: 'clear_tips' }),
                });
                flash(true, 'Tips moved to online balance');
                void load();
              }}
              className="absolute right-3 top-3 rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-medium hover:bg-white/40"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="mt-5 space-y-2 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-600">Email:</span>
            <Mail size={15} className="text-blue-400" />
            <span className="font-semibold text-blue-500">{maskEmail(data.store.email)}</span>
            <Btn
              className="px-3 py-1 text-xs"
              onClick={() => {
                setEmailOpen(true);
                setEmailStep(1);
                setEmailCode('');
                setCodeSent(false);
                setNewEmail('');
              }}
            >
              Change Email
            </Btn>
          </p>
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-600">Invite Link:</span>
            <span className="break-all text-slate-700">{inviteLink}</span>
            <button
              className="rounded border border-blue-200 bg-blue-50 p-1.5 text-blue-400 hover:text-blue-600"
              onClick={async () => {
                await navigator.clipboard.writeText(inviteLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              aria-label="Copy invite link"
            >
              {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
            </button>
          </p>
          <p className="rounded-lg bg-amber-50 px-4 py-2.5 text-amber-700">
            You only need to send the link to your users, and they can register their own member
            accounts.
          </p>
        </div>
      </Card>

      {/* Basic settings */}
      <Card>
        <h3 className="mb-1 w-fit border-b-2 border-blue-500 pb-2 text-base font-semibold text-blue-500">
          Basic
        </h3>
        <div className="mt-4 grid max-w-3xl grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Store Name">
            <TextInput
              maxLength={20}
              placeholder="Enter store brand name"
              value={form.storeName}
              onChange={(e) => setForm({ ...form, storeName: e.target.value })}
            />
          </Field>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">
              Daily Max Redeem
              <InfoDot />
              <span className="ml-2 text-xs font-normal text-slate-400">USD / day</span>
            </span>
            <TextInput
              type="number"
              value={form.dailyMaxRedeem}
              onChange={(e) => setForm({ ...form, dailyMaxRedeem: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">
              Daily Max Withdraw
              <InfoDot />
              <span className="ml-2 text-xs font-normal text-slate-400">USD / day</span>
            </span>
            <TextInput
              type="number"
              value={form.dailyMaxWithdraw}
              onChange={(e) => setForm({ ...form, dailyMaxWithdraw: e.target.value })}
            />
          </label>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-600">
              Store Logo
              <InfoDot />
            </span>
            <input
              ref={logoInput}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={(e) => pickLogo(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => logoInput.current?.click()}
              className="flex h-36 w-full max-w-44 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 transition hover:border-blue-400 hover:text-blue-400"
            >
              {form.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.logoUrl}
                  alt="Store logo"
                  className="h-full w-full rounded-lg object-contain p-1"
                />
              ) : (
                <>
                  <Plus size={30} strokeWidth={1.2} />
                  <span className="text-sm">Upload Image</span>
                  <span className="px-3 text-center text-xs text-slate-300">
                    Supports JPG, PNG, GIF, WEBP format, max 2MB
                  </span>
                </>
              )}
            </button>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">
              Phone Bind Reward SC
              <InfoDot />
              <span className="ml-2 text-xs font-normal text-slate-400">SC</span>
            </span>
            <TextInput
              type="number"
              value={form.phoneBindRewardSc}
              onChange={(e) => setForm({ ...form, phoneBindRewardSc: e.target.value })}
            />
          </label>
        </div>
        <Btn className="mt-5 w-40 justify-center" onClick={saveSettings}>
          Save
        </Btn>
      </Card>

      {/* Agent funding */}
      <Card>
        <div className="flex gap-6 overflow-x-auto border-b border-slate-100 text-sm font-medium">
          {(['deposit', 'withdraw', 'transfer'] as const).map((t) => (
            <button
              key={t}
              onClick={() => switchFundTab(t)}
              className={cn(
                'shrink-0 pb-2',
                fundTab === t ? 'border-b-2 border-blue-500 text-blue-500' : 'text-slate-600'
              )}
            >
              Agent {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="mx-auto mt-5 max-w-lg space-y-4">
          {fundTab !== 'transfer' && (
            <>
              <p className="text-sm font-medium text-slate-600">
                Select {fundTab === 'withdraw' ? 'Withdraw' : 'Payment'} Method
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(fundTab === 'deposit' ? DEPOSIT_METHODS : WITHDRAW_METHODS).map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMethod(m.key)}
                    className={cn(
                      'relative rounded-lg border px-4 py-3 text-left text-sm font-medium transition',
                      method === m.key
                        ? 'border-blue-500 bg-blue-50/50 text-slate-800'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {m.label}
                    {method === m.key && (
                      <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-bl-lg rounded-tr-lg bg-blue-500 text-white">
                        <Check size={11} strokeWidth={3} />
                      </span>
                    )}
                    {m.fee && (
                      <span className="absolute -right-1 -top-2 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {m.fee}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {fundTab === 'transfer' && (
            <>
              <Field label="Recipient agent" required>
                <TextInput
                  placeholder="Recipient agent username"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
              </Field>
              <Field label="Transfer amount" required>
                <TextInput
                  type="number"
                  placeholder="$Enter transfer amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Field>
              <Field label="Remark" hint={`${transferRemark.length} / 100`}>
                <TextInput
                  maxLength={100}
                  placeholder="Enter transfer remark (optional)"
                  value={transferRemark}
                  onChange={(e) => setTransferRemark(e.target.value)}
                />
              </Field>
            </>
          )}

          {fundTab === 'deposit' && (
            <Field label="Deposit Amount" required>
              <TextInput
                type="number"
                placeholder="$Please enter deposit amount (Minimum 50 USD)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
          )}
          {fundTab === 'withdraw' && (
            <>
              <Field label="Withdraw Amount" required>
                <TextInput
                  type="number"
                  placeholder="$Please enter withdraw amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Field>
              {Number(amount) > 0 && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>Platform Fee ({data.store.commissionPer}%):</span>
                    <span className="font-semibold text-slate-800">
                      {fmtMoney((Number(amount) * Number(data.store.commissionPer || 0)) / 100)}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-slate-200 pt-2">
                    <span>Net Payable Amount:</span>
                    <span className="font-bold text-green-600">
                      {fmtMoney(
                        Number(amount) -
                        (Number(amount) * Number(data.store.commissionPer || 0)) / 100
                      )}
                    </span>
                  </div>
                </div>
              )}
              <Field label="Address / Account">
                <TextInput
                  placeholder="Please enter your wallet address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </Field>
            </>
          )}

          {fundError && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500">
              {fundError}
            </div>
          )}

          <Btn
            className="w-full justify-center"
            onClick={submitFund}
            disabled={!amount || (fundTab === 'transfer' && !recipient)}
          >
            {fundTab === 'deposit' && 'Confirm Deposit'}
            {fundTab === 'withdraw' && 'Confirm Withdraw'}
            {fundTab === 'transfer' && 'OK'}
          </Btn>

          {fundTab === 'deposit' && (
            <button
              className="flex w-full items-center justify-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition"
              onClick={() => setGuideOpen(true)}
            >
              <HelpCircle size={14} /> Deposit Guide
            </button>
          )}

          {fundTab === 'transfer' && (
            <div className="flex gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Email Verification</p>
                <p className="mt-0.5">
                  Please enter the verification code sent to your email [
                  {maskEmail(data.store.email)}]
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Report + logs */}
      <Card>
        <div className="flex gap-6 overflow-x-auto border-b border-slate-100 text-sm font-semibold">
          {LOG_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setLogTab(t)}
              className={cn(
                'shrink-0 pb-2',
                logTab === t ? 'border-b-2 border-blue-500 text-blue-500' : 'text-slate-700'
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="mt-4">
          {dateFilter}

          {logTab === 'Report' && (
            <DataTable
              data={data.report}
              rowKey={(r) => r.day}
              columns={[
                { header: 'Start Time', accessorKey: 'day', cell: (r) => `${r.day} 00:00:00` },
                { header: 'End Time', cell: (r) => `${r.day} 23:59:59` },
                {
                  header: 'Deposit',
                  accessorKey: 'deposit',
                  cell: (r) => (
                    <span className="font-semibold text-green-600">{fmtMoney(r.deposit)}</span>
                  ),
                },
                {
                  header: 'Deposit Fee',
                  accessorKey: 'depositFee',
                  cell: (r) => (
                    <span className="font-semibold text-amber-500">{fmtMoney(r.depositFee)}</span>
                  ),
                },
                { header: 'Deposit Orders', accessorKey: 'depositOrders' },
              ]}
            />
          )}

          {logTab === 'Agent Deposit Log' && (
            <DataTable
              data={deposits}
              rowKey={(r) => r.id}
              columns={[
                {
                  header: 'Order No.',
                  accessorKey: 'id',
                  cell: (r) => <span className="font-mono text-xs">{orderNo(r.id)}</span>,
                },
                {
                  header: 'Deposit Amount',
                  accessorKey: 'amount',
                  cell: (r) => fmtMoney(r.amount),
                },
                {
                  header: 'Payment Method',
                  accessorKey: 'method',
                  cell: (r) => (r.method ? (METHOD_LABEL[r.method] ?? r.method) : '-'),
                },
                { header: 'Status', accessorKey: 'status', cell: (r) => statusChip(r.status) },
                { header: 'Time', accessorKey: 'createdAt', cell: (r) => fmtDateTime(r.createdAt) },
                {
                  header: 'Actions',
                  enableSorting: false,
                  enableGlobalFilter: false,
                  cell: actionCell,
                },
              ]}
            />
          )}

          {logTab === 'Agent Withdraw Log' && (
            <DataTable
              data={withdrawals}
              rowKey={(r) => r.id}
              columns={[
                {
                  header: 'Order No',
                  accessorKey: 'id',
                  cell: (r) => <span className="font-mono text-xs">{orderNo(r.id)}</span>,
                },
                {
                  header: 'Requested Amount',
                  accessorKey: 'amount',
                  cell: (r) => fmtMoney(r.amount),
                },
                {
                  header: 'Commission %',
                  accessorKey: 'commissionPer',
                  cell: (r) => (r.commissionPer ? `${r.commissionPer}%` : '-'),
                },
                {
                  header: 'Commission Amount',
                  accessorKey: 'fee',
                  cell: (r) => (
                    <span className="font-medium text-amber-500">{fmtMoney(r.fee)}</span>
                  ),
                },
                {
                  header: 'Net Payable Amount',
                  accessorKey: 'netAmount',
                  cell: (r) => (
                    <span className="font-semibold text-green-600">
                      {r.netAmount != null ? fmtMoney(r.netAmount) : '-'}
                    </span>
                  ),
                },
                {
                  header: 'Balance Before',
                  accessorKey: 'balanceBefore',
                  cell: (r) => (r.balanceBefore != null ? fmtMoney(r.balanceBefore) : '-'),
                },
                {
                  header: 'Balance After',
                  accessorKey: 'balanceAfter',
                  cell: (r) => (r.balanceAfter != null ? fmtMoney(r.balanceAfter) : '-'),
                },
                {
                  header: 'Order Status',
                  accessorKey: 'status',
                  cell: (r) => statusChip(r.status),
                },
                {
                  header: 'Actions',
                  enableSorting: false,
                  enableGlobalFilter: false,
                  cell: actionCell,
                },
              ]}
            />
          )}

          {logTab === 'Agent Transfer Log' && (
            <DataTable
              data={transfers}
              rowKey={(r) => r.id}
              columns={[
                {
                  header: 'Transaction ID',
                  accessorKey: 'id',
                  cell: (r) => <span className="font-mono text-xs">{orderNo(r.id)}</span>,
                },
                {
                  header: 'Type',
                  accessorKey: 'type',
                  cell: () => <span className="capitalize">Transfer</span>,
                },
                { header: 'Sender', cell: () => data.store.username },
                {
                  header: 'Receiver',
                  accessorKey: 'counterparty',
                  cell: (r) => r.counterparty ?? '-',
                },
                { header: 'Amount', accessorKey: 'amount', cell: (r) => fmtMoney(r.amount) },
                {
                  header: 'Remark',
                  accessorKey: 'remark',
                  cell: (r) => <div className="max-w-48 truncate">{r.remark ?? '-'}</div>,
                },
                { header: 'Time', accessorKey: 'createdAt', cell: (r) => fmtDateTime(r.createdAt) },
              ]}
            />
          )}

          {logTab === 'Agent Transfer Request Log' && (
            <DataTable
              data={transferRequests}
              rowKey={(r) => r.id}
              columns={[
                {
                  header: 'Transaction ID',
                  accessorKey: 'id',
                  cell: (r) => <span className="font-mono text-xs">{orderNo(r.id)}</span>,
                },
                { header: 'From', cell: () => data.store.username },
                { header: 'To', accessorKey: 'counterparty', cell: (r) => r.counterparty ?? '-' },
                { header: 'Amount', accessorKey: 'amount', cell: (r) => fmtMoney(r.amount) },
                { header: 'Status', accessorKey: 'status', cell: (r) => statusChip(r.status) },
                {
                  header: 'Actions',
                  enableSorting: false,
                  enableGlobalFilter: false,
                  cell: actionCell,
                },
              ]}
            />
          )}
        </div>
      </Card>

      {/* Change Email — 2-step (verify current → set new) */}
      <Modal
        title="Change Email"
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        footer={
          emailStep === 1 ? (
            <>
              <Btn variant="ghost" onClick={() => setEmailOpen(false)}>
                Cancel
              </Btn>
              <Btn disabled={emailCode.length !== 6} onClick={() => setEmailStep(2)}>
                Verify
              </Btn>
            </>
          ) : (
            <>
              <Btn variant="ghost" onClick={() => setEmailOpen(false)}>
                Cancel
              </Btn>
              <Btn
                disabled={!newEmail.includes('@')}
                onClick={async () => {
                  await api('/api/agent/wallet', {
                    method: 'PUT',
                    body: JSON.stringify({ email: newEmail }),
                  });
                  setEmailOpen(false);
                  flash(true, 'Email updated');
                  void load();
                }}
              >
                Confirm
              </Btn>
            </>
          )
        }
      >
        {emailStep === 1 ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-100 px-5 py-4">
              <p className="text-lg font-medium text-slate-600">Security Verification</p>
              <p className="mt-1 text-sm text-slate-500">
                To protect your account, please verify your current email first.
              </p>
            </div>
            <div className="rounded-lg bg-blue-50/60 px-5 py-4">
              <p className="text-sm">
                <span className="font-semibold text-slate-600">Current Email: </span>
                <span className="font-semibold text-blue-500">{maskEmail(data.store.email)}</span>
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <TextInput
                  maxLength={6}
                  placeholder="Please enter 6-digit verification code"
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ''))}
                />
                <Btn
                  className="shrink-0 justify-center"
                  disabled={codeSent}
                  onClick={() => {
                    setCodeSent(true);
                    setTimeout(() => setCodeSent(false), 30000);
                  }}
                >
                  {codeSent ? 'Code Sent' : 'Send Code'}
                </Btn>
              </div>
            </div>
          </div>
        ) : (
          <Field
            label="New Email"
            required
            hint="A verification email will be sent to this address."
          >
            <TextInput
              type="email"
              placeholder="name@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </Field>
        )}
      </Modal>

      {/* Deposit Guide Modal */}
      <Modal
        open={guideOpen}
        onClose={() => {
          setGuideOpen(false);
          setGuideStep(1); // Reset to first step on close
        }}
        title={method === 'paypal_pyusd' ? 'How to buy PYUSD using PayPal?' : 'Deposit Guide'}
      >
        <div className="relative flex flex-col items-center justify-center py-4">
          <img
            src={`/img/deposit-guide/deposite-step-${guideStep}.png`}
            alt={`Step ${guideStep}`}
            className="max-h-[65vh] object-contain drop-shadow-md"
          />
          <button
            className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-400 text-white shadow hover:bg-slate-500 disabled:opacity-30 disabled:hover:bg-slate-400"
            disabled={guideStep <= 1}
            onClick={() => setGuideStep(s => s - 1)}
          >
            <ChevronLeft size={24} />
          </button>
          <button
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-400 text-white shadow hover:bg-slate-500 disabled:opacity-30 disabled:hover:bg-slate-400"
            disabled={guideStep >= 4}
            onClick={() => setGuideStep(s => s + 1)}
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </Modal>

      {/* Rejection Reason Modal */}
      <Modal
        title="Reason"
        open={!!reasonModal}
        onClose={() => setReasonModal(null)}
      >
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
          {reasonModal}
        </div>
        <div className="mt-6 flex justify-end">
          <Btn onClick={() => setReasonModal(null)}>Close</Btn>
        </div>
      </Modal>
    </div>
  );
}
