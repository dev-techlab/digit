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
} from 'lucide-react';
import {
  api,
  Btn,
  Card,
  Field,
  fmtMoney,
  fmtDateTime,
  Modal,
  Table,
  TextInput,
} from '../ui';
import { cn } from '@/lib/cn';

interface LogRow {
  id: string;
  type: 'deposit' | 'withdraw' | 'transfer';
  method: string | null;
  amount: string;
  fee: string;
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

  // Change Email — 2-step modal (verify current email → enter new email).
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailStep, setEmailStep] = useState<1 | 2>(1);
  const [emailCode, setEmailCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [newEmail, setNewEmail] = useState('');

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

  const load = () =>
    api<WalletData>('/api/agent/wallet').then((d) => {
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
  useEffect(() => {
    void load();
  }, []);

  if (!data) return <p className="p-6 text-sm text-slate-400">Loading…</p>;

  const inviteLink = `https://digitlink.mobi?inviteCode=${data.store.inviteCode}`;
  const dateRange = `${new Date(Date.now() - 4 * 864e5).toLocaleDateString('en-US')} 00:00:00 - ${new Date().toLocaleDateString('en-US')} 00:00:00`;

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
      flash(false, (e as Error).message);
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

  const dateFilter = (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3">
      <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">
        📅 {dateRange}
      </span>
      <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-400">
        US Eastern (ET)
      </span>
    </div>
  );

  const switchFundTab = (t: 'deposit' | 'withdraw' | 'transfer') => {
    setFundTab(t);
    setMethod('paypal_pyusd');
    setAmount('');
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
              <Field label="Address / Account">
                <TextInput
                  placeholder="Please enter your wallet address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </Field>
            </>
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
            <p className="flex items-center justify-center gap-1.5 text-sm text-slate-400">
              <HelpCircle size={14} /> Deposit Guide
            </p>
          )}
          {fundTab === 'withdraw' && (
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <p className="font-semibold">First Time Using Withdraw Address</p>
              <p className="mt-1">
                You are setting up your withdraw address for the first time. Email verification is
                required to ensure account security.
              </p>
            </div>
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
            <Table
              headers={['Start Time', 'End Time', 'Deposit', 'Deposit Fee', 'Deposit Orders']}
              empty={data.report.length === 0}
            >
              {data.report.map((r) => (
                <tr key={r.day}>
                  <td className="px-4 py-3">{r.day} 00:00:00</td>
                  <td className="px-4 py-3">{r.day} 23:59:59</td>
                  <td className="px-4 py-3 font-semibold text-green-600">{fmtMoney(r.deposit)}</td>
                  <td className="px-4 py-3 font-semibold text-amber-500">
                    {fmtMoney(r.depositFee)}
                  </td>
                  <td className="px-4 py-3">{r.depositOrders}</td>
                </tr>
              ))}
            </Table>
          )}

          {logTab === 'Agent Deposit Log' && (
            <Table
              headers={['Order No.', 'Deposit Amount', 'Payment Method', 'Status', 'Time', 'Actions']}
              empty={deposits.length === 0}
            >
              {deposits.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-mono text-xs">{orderNo(l.id)}</td>
                  <td className="px-4 py-3">{fmtMoney(l.amount)}</td>
                  <td className="px-4 py-3">{l.method ? METHOD_LABEL[l.method] ?? l.method : '-'}</td>
                  <td className="px-4 py-3">{statusChip(l.status)}</td>
                  <td className="px-4 py-3">{fmtDateTime(l.createdAt)}</td>
                  <td className="px-4 py-3">
                    {l.status === 'pending' ? (
                      <button
                        className="text-red-500 hover:underline"
                        onClick={() => void cancelTx(l.id)}
                      >
                        Cancel
                      </button>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}

          {logTab === 'Agent Withdraw Log' && (
            <Table
              headers={[
                'Order No',
                'Withdrawal Amount',
                'Fee',
                'Balance Before',
                'Balance After',
                'Order Status',
                'Actions',
              ]}
              empty={withdrawals.length === 0}
            >
              {withdrawals.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-mono text-xs">{orderNo(l.id)}</td>
                  <td className="px-4 py-3">{fmtMoney(l.amount)}</td>
                  <td className="px-4 py-3">{fmtMoney(l.fee)}</td>
                  <td className="px-4 py-3">
                    {l.balanceBefore != null ? fmtMoney(l.balanceBefore) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {l.balanceAfter != null ? fmtMoney(l.balanceAfter) : '-'}
                  </td>
                  <td className="px-4 py-3">{statusChip(l.status)}</td>
                  <td className="px-4 py-3">
                    {l.status === 'pending' ? (
                      <button
                        className="text-red-500 hover:underline"
                        onClick={() => void cancelTx(l.id)}
                      >
                        Cancel
                      </button>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}

          {logTab === 'Agent Transfer Log' && (
            <Table
              headers={['Transaction ID', 'Type', 'Sender', 'Receiver', 'Amount', 'Remark', 'Time']}
              empty={transfers.length === 0}
            >
              {transfers.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-mono text-xs">{orderNo(l.id)}</td>
                  <td className="px-4 py-3 capitalize">Transfer</td>
                  <td className="px-4 py-3">{data.store.username}</td>
                  <td className="px-4 py-3">{l.counterparty ?? '-'}</td>
                  <td className="px-4 py-3">{fmtMoney(l.amount)}</td>
                  <td className="max-w-48 truncate px-4 py-3">{l.remark ?? '-'}</td>
                  <td className="px-4 py-3">{fmtDateTime(l.createdAt)}</td>
                </tr>
              ))}
            </Table>
          )}

          {logTab === 'Agent Transfer Request Log' && (
            <Table
              headers={['Transaction ID', 'From', 'To', 'Amount', 'Status', 'Actions']}
              empty={transferRequests.length === 0}
            >
              {transferRequests.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-mono text-xs">{orderNo(l.id)}</td>
                  <td className="px-4 py-3">{data.store.username}</td>
                  <td className="px-4 py-3">{l.counterparty ?? '-'}</td>
                  <td className="px-4 py-3">{fmtMoney(l.amount)}</td>
                  <td className="px-4 py-3">{statusChip(l.status)}</td>
                  <td className="px-4 py-3">
                    <button
                      className="text-red-500 hover:underline"
                      onClick={() => void cancelTx(l.id)}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
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
          <Field label="New Email" required hint="A verification email will be sent to this address.">
            <TextInput
              type="email"
              placeholder="name@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </Field>
        )}
      </Modal>
    </div>
  );
}
