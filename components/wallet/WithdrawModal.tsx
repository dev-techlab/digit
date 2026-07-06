'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import type { WalletBalance } from '@/lib/types';

const METHODS = ['ACH Bank Transfer', 'Debit Card', 'Cash App', 'Chime', 'Crypto Wallet'] as const;

type Stage = 'form' | 'processing' | 'success';

export function WithdrawModal({
  open,
  onClose,
  wallet,
}: {
  open: boolean;
  onClose: () => void;
  wallet: WalletBalance;
}) {
  const [method, setMethod] = useState<(typeof METHODS)[number]>(METHODS[0]);
  const [feeMode, setFeeMode] = useState<'standard' | 'waiver'>('waiver');
  const [amount, setAmount] = useState('');
  const [stage, setStage] = useState<Stage>('form');

  useEffect(() => {
    if (open) {
      setStage('form');
      setAmount('');
    }
  }, [open]);

  const numericAmount = Number(amount);
  const exceedsBalance = numericAmount > Number(wallet.withdrawable);
  const invalid = !amount || numericAmount <= 0 || exceedsBalance;

  const submit = () => {
    if (invalid) return;
    setStage('processing');
    window.setTimeout(() => setStage('success'), 900);
  };

  if (stage !== 'form') {
    return (
      <Modal open={open} onClose={onClose} title="Withdraw">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          {stage === 'processing' ? (
            <>
              <Loader2 size={40} className="animate-spin text-brand" />
              <p className="font-semibold">Submitting your withdrawal...</p>
            </>
          ) : (
            <>
              <CheckCircle2 size={40} className="text-success" />
              <p className="font-bold">Withdrawal Requested</p>
              <p className="text-sm text-[var(--text-secondary)]">
                Your request for ${numericAmount.toFixed(2)} via {method} is being reviewed. Track
                its status in Order History.
              </p>
              <Button fullWidth className="mt-2" onClick={onClose}>
                Done
              </Button>
            </>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Withdraw">
      <div className="space-y-5">
        <div className="rounded-md bg-white/5 px-4 py-3 text-sm">
          <div className="flex justify-between text-[var(--text-secondary)]">
            <span>Available to Withdraw</span>
            <span className="font-bold text-brand">{wallet.withdrawable} SC</span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">
            Withdrawal Method
          </p>
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={cn(
                  'rounded-md border px-3 py-2.5 text-left text-sm font-medium transition-colors',
                  method === m
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-[var(--card-border)] bg-white/5 text-[var(--text-secondary)]'
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Input
            placeholder="Enter amount"
            inputMode="decimal"
            value={amount}
            error={Boolean(amount) && exceedsBalance}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
          />
          {Boolean(amount) && exceedsBalance && (
            <p className="mt-1 text-xs text-danger">Amount exceeds your withdrawable balance</p>
          )}
        </div>

        {method === 'ACH Bank Transfer' && (
          <div className="space-y-3">
            <Input placeholder="ACH Routing Number" />
            <Input placeholder="Account Number" />
          </div>
        )}
        {method === 'Crypto Wallet' && <Input placeholder="Wallet address" />}
        {(method === 'Cash App' || method === 'Chime') && (
          <Input placeholder="$Cashtag or username" />
        )}

        <div>
          <p className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">Fee Options</p>
          <div className="space-y-2">
            <button
              onClick={() => setFeeMode('waiver')}
              className={cn(
                'flex w-full items-center justify-between rounded-md border px-4 py-3 text-left text-sm',
                feeMode === 'waiver'
                  ? 'border-brand bg-brand/10'
                  : 'border-[var(--card-border)] bg-white/5'
              )}
            >
              <span>
                <span className="mr-2 font-semibold">Fee Waiver</span>
                <Badge tone="success">No Fee</Badge>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">
                  Convert an SC bonus to balance instead of paying a fee
                </div>
              </span>
            </button>
            <button
              onClick={() => setFeeMode('standard')}
              className={cn(
                'flex w-full items-center justify-between rounded-md border px-4 py-3 text-left text-sm',
                feeMode === 'standard'
                  ? 'border-brand bg-brand/10'
                  : 'border-[var(--card-border)] bg-white/5'
              )}
            >
              <span className="font-semibold">Standard Fee</span>
              <span className="text-[var(--text-secondary)]">$2.50</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-[var(--text-secondary)]">
          Please ensure your account details are correct. Incorrect information may result in
          withdrawal failure or delays.
        </p>

        <Button fullWidth disabled={invalid} onClick={submit}>
          Submit Withdrawal
        </Button>
      </div>
    </Modal>
  );
}
