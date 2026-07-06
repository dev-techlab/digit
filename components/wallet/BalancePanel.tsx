'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ShopModal } from './ShopModal';
import { WithdrawModal } from './WithdrawModal';
import type { WalletBalance } from '@/lib/types';

export function BalancePanel({
  wallet,
  open,
  onClose,
}: {
  wallet: WalletBalance;
  open: boolean;
  onClose: () => void;
}) {
  const [showInfo, setShowInfo] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  return (
    <>
      <Modal open={open} onClose={onClose} title="Wallet">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
              <span>Gold Coins</span>
              <span className="font-bold text-amber-400">{wallet.goldCoin}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Play Only</p>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Sweepstakes Coins</span>
              <button
                onClick={() => setShowInfo((v) => !v)}
                className="flex items-center gap-1 text-xs text-[var(--text-secondary)]"
              >
                <Info size={13} /> What is GC/SC?
              </button>
            </div>
            {showInfo && (
              <p className="mb-3 rounded-md bg-white/5 p-2 text-xs text-[var(--text-secondary)]">
                Gold Coins (GC) are for fun play only and have no cash value. Sweepstakes Coins (SC)
                can be redeemed for cash prizes once wagering requirements are met.
              </p>
            )}
            <dl className="space-y-2 text-sm">
              <Row label="Online SC" value={wallet.onlineSC} />
              <Row label="Store SC" value={wallet.storeSC} />
              <Row label="Kiosk SC" value={wallet.kioskSC} />
              <div className="my-2 h-px bg-[var(--divider-color)]" />
              <Row label="Total Balance" value={wallet.totalBalance} emphasis />
              <Row
                label="Unplayed"
                value={wallet.unwagered}
                hint="Needs to be played before withdrawal"
              />
              <Row
                label="Redeemable"
                value={wallet.withdrawable}
                hint="Available for withdrawal"
                emphasis
              />
              <Row label="Free Bonus" value={wallet.freeBonus} />
            </dl>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => setWithdrawOpen(true)}>
              Withdraw
            </Button>
            <Button onClick={() => setDepositOpen(true)}>Deposit</Button>
          </div>
        </div>
      </Modal>

      <ShopModal open={depositOpen} onClose={() => setDepositOpen(false)} />
      <WithdrawModal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} wallet={wallet} />
    </>
  );
}

function Row({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--text-secondary)]">
        {label}
        {hint && <span className="block text-[11px] opacity-70">{hint}</span>}
      </span>
      <span className={emphasis ? 'font-bold text-brand' : 'font-medium'}>{value}</span>
    </div>
  );
}
