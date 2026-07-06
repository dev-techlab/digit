'use client';

import { useEffect, useRef, useState } from 'react';
import { Coins, ChevronDown, Plus, Upload, HelpCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/lib/auth-modal-context';
import { ShopModal } from './ShopModal';
import { WithdrawModal } from './WithdrawModal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { WalletBalance } from '@/lib/types';

export function BalanceCapsule({ wallet }: { wallet: WalletBalance }) {
  const { isAuthenticated } = useAuth();
  const { open } = useAuthModal();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click or Escape.
  useEffect(() => {
    if (!dropdownOpen) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDropdownOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [dropdownOpen]);

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => open('login')}
        className="rounded-pill bg-brand-solid px-4 py-1.5 text-sm font-semibold text-white shadow-glowBrand"
      >
        Sign In
      </button>
    );
  }

  const total = Number(wallet.totalBalance);
  const unwagered = Number(wallet.unwagered);
  const withdrawable = Number(wallet.withdrawable);
  const unwageredPct = total > 0 ? (unwagered / total) * 100 : 0;
  const withdrawablePct = total > 0 ? (withdrawable / total) * 100 : 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setDropdownOpen((v) => !v)}
        aria-expanded={dropdownOpen}
        className="balance-capsule flex items-center gap-2.5 rounded-pill border border-[var(--card-border)] bg-white/5 px-3 py-1.5"
      >
        <span className="flex items-center gap-1 text-sm font-bold text-amber-400">
          <Coins size={14} /> {Number(wallet.goldCoin).toLocaleString()}
        </span>
        <span className="h-3 w-px bg-white/15" />
        <span className="balance-amount-sc-glow text-sm font-bold text-brand">
          {total.toFixed(2)} SC
        </span>
        <ChevronDown
          size={15}
          className={cn(
            'text-[var(--text-secondary)] transition-transform',
            dropdownOpen && 'rotate-180'
          )}
        />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[330px] max-w-[calc(100vw-2rem)] animate-modalScaleIn space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--modal-bg)] p-3 shadow-2xl">
          {/* Gold Coins */}
          <div className="flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-white/[0.03] p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-black">
              GC
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold">Gold Coins</p>
              <p className="text-xs text-[var(--text-secondary)]">Play Only</p>
            </div>
            <div className="ml-auto h-2 w-20 overflow-hidden rounded-full bg-[var(--divider-color)]">
              <div className="h-full w-full rounded-full bg-gradient-to-r from-brand-solid to-brand" />
            </div>
          </div>

          {/* Sweepstakes Coins */}
          <div className="rounded-xl border border-brand/40 bg-brand/[0.06] p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-solid text-[10px] font-black text-white">
                SC
              </span>
              <p className="flex-1 text-sm font-bold">Sweepstakes Coins</p>
              <p className="text-base font-black">{total.toFixed(2)}</p>
            </div>

            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[var(--divider-color)]">
              <div className="h-full bg-info" style={{ width: `${unwageredPct}%` }} />
              <div className="h-full bg-brand-solid" style={{ width: `${withdrawablePct}%` }} />
            </div>

            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                <span className="h-1.5 w-1.5 rounded-full bg-info" />
                Unplayed <b className="text-[var(--text-primary)]">{unwagered.toFixed(2)}</b>
              </span>
              <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-solid" />
                Redeemable <b className="text-brand">{withdrawable.toFixed(2)}</b>
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="py-2.5 text-sm"
              onClick={() => {
                setDropdownOpen(false);
                setDepositOpen(true);
              }}
            >
              <Plus size={16} /> Deposit
            </Button>
            <Button
              variant="secondary"
              className="py-2.5 text-sm"
              onClick={() => {
                setDropdownOpen(false);
                setWithdrawOpen(true);
              }}
            >
              <Upload size={16} /> Withdraw
            </Button>
          </div>

          {/* What is GC/SC? */}
          <button
            onClick={() => setShowInfo((v) => !v)}
            className="flex w-full items-center gap-2 rounded-xl border border-[var(--card-border)] bg-white/[0.03] p-3 text-sm hover:bg-white/[0.06]"
          >
            <HelpCircle size={16} className="text-[var(--text-secondary)]" />
            <span className="flex-1 text-left">What is GC/SC?</span>
            <ChevronRight
              size={16}
              className={cn(
                'text-[var(--text-secondary)] transition-transform',
                showInfo && 'rotate-90'
              )}
            />
          </button>
          {showInfo && (
            <p className="rounded-xl bg-white/[0.03] p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
              Gold Coins (GC) are for fun play only and have no cash value. Sweepstakes Coins (SC)
              can be redeemed for cash prizes once wagering requirements are met.
            </p>
          )}
        </div>
      )}

      <ShopModal open={depositOpen} onClose={() => setDepositOpen(false)} />
      <WithdrawModal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} wallet={wallet} />
    </div>
  );
}
