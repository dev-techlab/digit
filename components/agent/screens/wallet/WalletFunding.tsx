'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { api, Btn, Card, Field, fmtMoney, TextInput } from '@/components/agent/ui';
import { cn } from '@/lib/cn';

interface WalletFundingProps {
  commissionPer: string;
  onSuccess: () => void;
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

export function WalletFunding({ commissionPer, onSuccess }: WalletFundingProps) {
  const [fundTab, setFundTab] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit');
  const [method, setMethod] = useState('paypal_pyusd');
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [recipient, setRecipient] = useState('');
  const [transferRemark, setTransferRemark] = useState('');
  const [fundError, setFundError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchFundTab = (t: 'deposit' | 'withdraw' | 'transfer') => {
    setFundTab(t);
    setMethod('paypal_pyusd');
    setAmount('');
    setFundError('');
  };

  const submitFund = async () => {
    setFundError('');
    setLoading(true);
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
      window.alert(`${fundTab[0].toUpperCase()}${fundTab.slice(1)} request submitted`);
      onSuccess();
    } catch (e) {
      setFundError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
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
                  <span>Platform Fee ({commissionPer}%):</span>
                  <span className="font-semibold text-slate-800">
                    {fmtMoney((Number(amount) * Number(commissionPer || 0)) / 100)}
                  </span>
                </div>
                <div className="mt-2 flex justify-between border-t border-slate-200 pt-2">
                  <span>Net Payable Amount:</span>
                  <span className="font-bold text-green-600">
                    {fmtMoney(Number(amount) - (Number(amount) * Number(commissionPer || 0)) / 100)}
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
          disabled={!amount || (fundTab === 'transfer' && !recipient) || loading}
        >
          {loading ? 'Submitting...' : 'Submit'}
        </Btn>
      </div>
    </Card>
  );
}
