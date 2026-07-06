'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const METHODS = ['Debit Card', 'Bitcoin On-Chain', 'Bitcoin Lightning Network', 'PYUSD'] as const;
const TIERS = [
  { amount: '10.00', bonusAmount: '0.00' },
  { amount: '20.00', bonusAmount: '5.00' },
  { amount: '50.00', bonusAmount: '10.00' },
  { amount: '100.00', bonusAmount: '15.00' },
  { amount: '500.00', bonusAmount: '50.00' },
];

type Stage = 'form' | 'processing' | 'success';

export function DepositModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [method, setMethod] = useState<(typeof METHODS)[number]>(METHODS[0]);
  const [tierIndex, setTierIndex] = useState(1);
  const [stage, setStage] = useState<Stage>('form');

  useEffect(() => {
    if (open) setStage('form');
  }, [open]);

  const submit = () => {
    setStage('processing');
    window.setTimeout(() => setStage('success'), 900);
  };

  if (stage !== 'form') {
    return (
      <Modal open={open} onClose={onClose} title="Deposit">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          {stage === 'processing' ? (
            <>
              <Loader2 size={40} className="animate-spin text-brand" />
              <p className="font-semibold">Processing your deposit...</p>
            </>
          ) : (
            <>
              <CheckCircle2 size={40} className="text-success" />
              <p className="font-bold">Order Created</p>
              <p className="text-sm text-[var(--text-secondary)]">
                Complete payment for ${TIERS[tierIndex].amount} via {method} to receive{' '}
                {(Number(TIERS[tierIndex].amount) + Number(TIERS[tierIndex].bonusAmount)).toFixed(
                  2
                )}{' '}
                SC.
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
    <Modal open={open} onClose={onClose} title="Deposit">
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">Payment Method</p>
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
          <p className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">Amount</p>
          <div className="grid grid-cols-3 gap-2">
            {TIERS.map((tier, i) => (
              <button
                key={tier.amount}
                onClick={() => setTierIndex(i)}
                className={cn(
                  'relative rounded-md border px-2 py-3 text-center transition-colors',
                  tierIndex === i
                    ? 'border-brand bg-brand/10'
                    : 'border-[var(--card-border)] bg-white/5'
                )}
              >
                <div className="text-sm font-bold">${tier.amount}</div>
                {Number(tier.bonusAmount) > 0 && (
                  <div className="mt-0.5 text-[11px] font-semibold text-success">
                    +${tier.bonusAmount} SC
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md bg-white/5 px-4 py-3 text-sm">
          <span className="text-[var(--text-secondary)]">You&apos;ll receive</span>
          <span className="font-bold text-brand">
            {(Number(TIERS[tierIndex].amount) + Number(TIERS[tierIndex].bonusAmount)).toFixed(2)} SC
          </span>
        </div>

        <Button fullWidth onClick={submit}>
          Recharge ${TIERS[tierIndex].amount}
        </Button>
      </div>
    </Modal>
  );
}
