'use client';

import { useState } from 'react';
import { HelpCircle, AlertCircle, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, Btn, Card, Field, TextInput, Modal, fmtMoney } from '../../ui';
import { cn } from '@/lib/cn';
import { WalletData } from './types';

const DEPOSIT_METHODS: { key: string; label: string; fee?: string }[] = [
  { key: 'paypal_pyusd', label: 'Paypal PYUSD' },
  { key: 'cashapp_usdc', label: 'Cashapp USDC' },
  { key: 'bitcoin', label: 'Bitcoin' },
  { key: 'bitcoin_lightning', label: 'Bitcoin Lightning Network' },
];
const WITHDRAW_METHODS: { key: string; label: string; fee?: string }[] = [
  { key: 'paypal_pyusd', label: 'Paypal PYUSD', fee: 'FEE UP TO $2' },
  { key: 'cashapp_usdc', label: 'Cashapp USDC', fee: 'FEE UP TO $2' },
  { key: 'bitcoin', label: 'Bitcoin' },
  { key: 'bank_card', label: 'Bank Card' },
  { key: 'ach', label: 'ACH Bank Transfer' },
];

function maskEmail(email: string | null) {
  if (!email) return '-';
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}***@${domain ?? ''}`;
}

interface Props {
  data: WalletData;
  mutate: () => void;
  flash: (ok: boolean, text: string) => void;
}

export function WalletFunding({ data, mutate, flash }: Props) {
  const [fundTab, setFundTab] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit');
  const [method, setMethod] = useState('paypal_pyusd');
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [recipient, setRecipient] = useState('');
  const [transferRemark, setTransferRemark] = useState('');
  const [fundError, setFundError] = useState('');
  
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(1);

  const switchFundTab = (t: 'deposit' | 'withdraw' | 'transfer') => {
    setFundTab(t);
    setMethod('paypal_pyusd');
    setAmount('');
    setFundError('');
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
      mutate();
    } catch (e) {
      setFundError((e as Error).message);
    }
  };

  return (
    <>
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipient(e.target.value)}
                />
              </Field>
              <Field label="Transfer amount" required>
                <TextInput
                  type="number"
                  placeholder="$Enter transfer amount"
                  value={amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
                />
              </Field>
              <Field label="Remark" hint={`${transferRemark.length} / 100`}>
                <TextInput
                  maxLength={100}
                  placeholder="Enter transfer remark (optional)"
                  value={transferRemark}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransferRemark(e.target.value)}
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
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
              className="flex w-full items-center justify-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-600"
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

      <Modal
        open={guideOpen}
        onClose={() => {
          setGuideOpen(false);
          setGuideStep(1);
        }}
        title={method === 'paypal_pyusd' ? 'How to buy PYUSD using PayPal?' : 'Deposit Guide'}
      >
        <div className="relative flex flex-col items-center justify-center py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/img/deposit-guide/deposite-step-${guideStep}.png`}
            alt={`Step ${guideStep}`}
            className="max-h-[65vh] object-contain drop-shadow-md"
          />
          <button
            className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-400 text-white shadow hover:bg-slate-500 disabled:opacity-30 disabled:hover:bg-slate-400"
            disabled={guideStep <= 1}
            onClick={() => setGuideStep((s) => s - 1)}
          >
            <ChevronLeft size={24} />
          </button>
          <button
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-400 text-white shadow hover:bg-slate-500 disabled:opacity-30 disabled:hover:bg-slate-400"
            disabled={guideStep >= 4}
            onClick={() => setGuideStep((s) => s + 1)}
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </Modal>
    </>
  );
}
