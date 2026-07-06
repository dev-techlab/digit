'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Coins, Crown, Flame, Gift, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

type ShopTab = 'packages' | 'firstDeposit';
type Stage = 'browse' | 'processing' | 'success';

interface Pkg {
  gc: number;
  /** Base free SC (before any first-deposit bonus). */
  baseSc: number;
  price: number;
}

/** Base free SC and price both track $1 : 1 SC : 100 GC. */
const GC_TIERS = [500, 1000, 2000, 3000, 5000, 8000, 10000, 20000, 50000] as const;

const COIN_PACKAGES: Pkg[] = GC_TIERS.map((gc) => ({
  gc,
  baseSc: gc / 100,
  price: gc / 100,
}));

/** First-deposit ladder tops out at 30k GC and adds a one-time +20% SC bonus. */
const FIRST_DEPOSIT: Pkg[] = [500, 1000, 2000, 3000, 5000, 8000, 10000, 20000, 30000].map((gc) => ({
  gc,
  baseSc: gc / 100,
  price: gc / 100,
}));

const FIRST_DEPOSIT_BONUS_RATE = 0.2;

const usd = (n: number) => `$${n.toFixed(2)}`;

export function ShopModal({
  open,
  onClose,
  defaultTab = 'packages',
}: {
  open: boolean;
  onClose: () => void;
  defaultTab?: ShopTab;
}) {
  const [tab, setTab] = useState<ShopTab>(defaultTab);
  const [stage, setStage] = useState<Stage>('browse');
  const [selected, setSelected] = useState<Pkg | null>(null);

  useEffect(() => {
    if (open) {
      setTab(defaultTab);
      setStage('browse');
      setSelected(null);
    }
  }, [open, defaultTab]);

  const isFirstDeposit = tab === 'firstDeposit';
  const bonusFor = (pkg: Pkg) =>
    isFirstDeposit ? Math.round(pkg.baseSc * FIRST_DEPOSIT_BONUS_RATE) : 0;

  const buy = (pkg: Pkg) => {
    setSelected(pkg);
    setStage('processing');
    window.setTimeout(() => setStage('success'), 900);
  };

  if (stage !== 'browse' && selected) {
    const totalSc = selected.baseSc + bonusFor(selected);
    return (
      <Modal open={open} onClose={onClose} title="Shop">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          {stage === 'processing' ? (
            <>
              <Loader2 size={40} className="animate-spin text-brand" />
              <p className="font-semibold">Processing your purchase...</p>
            </>
          ) : (
            <>
              <CheckCircle2 size={40} className="text-success" />
              <p className="font-bold">Order Created</p>
              <p className="text-sm text-[var(--text-secondary)]">
                Complete payment of {usd(selected.price)} to receive{' '}
                <span className="font-semibold text-amber-400">
                  {selected.gc.toLocaleString()} GC
                </span>{' '}
                plus <span className="font-semibold text-brand">{totalSc.toLocaleString()} SC</span>{' '}
                free.
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

  const packages = isFirstDeposit ? FIRST_DEPOSIT : COIN_PACKAGES;

  return (
    <Modal open={open} onClose={onClose} title="Shop">
      {/* Tabs */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-1">
        <TabButton
          active={!isFirstDeposit}
          accent="emerald"
          icon={<Coins size={15} />}
          label="Coin Packages"
          onClick={() => setTab('packages')}
        />
        <TabButton
          active={isFirstDeposit}
          accent="amber"
          icon={<Crown size={15} />}
          label="First Deposit"
          onClick={() => setTab('firstDeposit')}
        />
      </div>

      {/* Promo banner */}
      {isFirstDeposit ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-violet-400/25 bg-violet-400/10 px-3 py-2.5 text-sm font-medium text-violet-200">
          <Flame size={16} className="shrink-0 text-amber-400" />
          <span>
            First Deposit Exclusive — Up to <b className="text-amber-400">+25%</b> extra SC!
            One-time only.
          </span>
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2.5 text-sm font-semibold text-emerald-300">
          <Gift size={16} className="shrink-0" />
          <span>Purchase GC and get FREE SC as bonus!</span>
        </div>
      )}

      {/* Package grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {packages.map((pkg) => (
          <PackageCard
            key={pkg.gc}
            pkg={pkg}
            bonus={bonusFor(pkg)}
            firstDeposit={isFirstDeposit}
            onBuy={() => buy(pkg)}
          />
        ))}
      </div>
    </Modal>
  );
}

function TabButton({
  active,
  accent,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  accent: 'emerald' | 'amber';
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-lg border-b-2 px-2 py-2.5 text-sm font-semibold transition-colors',
        active
          ? cn(
              'bg-[var(--modal-bg)]',
              accent === 'emerald'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-amber-400 text-amber-400'
            )
          : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function PackageCard({
  pkg,
  bonus,
  firstDeposit,
  onBuy,
}: {
  pkg: Pkg;
  bonus: number;
  firstDeposit: boolean;
  onBuy: () => void;
}) {
  const totalSc = pkg.baseSc + bonus;
  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-lg border p-3 text-center',
        firstDeposit
          ? 'border-violet-400/30 bg-violet-400/[0.05]'
          : 'border-emerald-400/20 bg-emerald-400/[0.03]'
      )}
    >
      {firstDeposit && (
        <span className="absolute right-0 top-0 rounded-bl-lg bg-gradient-to-r from-fuchsia-500 to-violet-500 px-2 py-0.5 text-[10px] font-bold text-white">
          +{Math.round(FIRST_DEPOSIT_BONUS_RATE * 100)}% SC
        </span>
      )}

      <div className="mb-3 mt-1 flex items-center justify-center gap-1.5">
        <CoinChip kind="gc" />
        <span className="text-lg font-black tabular-nums">{pkg.gc.toLocaleString()}</span>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-center gap-1 rounded-md border border-[var(--card-border)] bg-black/20 px-2 py-1.5">
        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-400">
          Free
        </span>
        <CoinChip kind="sc" />
        <span className="text-xs font-bold text-emerald-400">+{totalSc.toLocaleString()}</span>
        {bonus > 0 && (
          <span className="text-[10px] text-[var(--text-secondary)]">
            ({pkg.baseSc.toLocaleString()}+{bonus.toLocaleString()})
          </span>
        )}
      </div>

      <button
        onClick={onBuy}
        className="mt-auto rounded-pill bg-gradient-to-b from-amber-300 to-amber-500 px-3 py-2 text-sm font-bold text-black shadow-sm transition hover:brightness-105 active:brightness-95"
      >
        {usd(pkg.price)}
      </button>
    </div>
  );
}

function CoinChip({ kind }: { kind: 'gc' | 'sc' }) {
  return (
    <span
      className={cn(
        'inline-grid place-items-center rounded-full font-black text-black',
        kind === 'gc'
          ? 'h-[18px] w-[18px] bg-gradient-to-b from-amber-300 to-amber-500 text-[8px]'
          : 'h-4 w-4 bg-gradient-to-b from-emerald-300 to-emerald-500 text-[7px]'
      )}
    >
      {kind.toUpperCase()}
    </span>
  );
}
