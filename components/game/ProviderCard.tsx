'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Star, DollarSign, UserRound, RefreshCw, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/lib/auth-modal-context';
import { cn } from '@/lib/cn';
import type { GameProvider } from '@/lib/types';

type Action = 'idle' | 'login' | 'create';

export function ProviderCard({ provider }: { provider: GameProvider }) {
  const isGC = provider.providerType === 'GC';
  const hasBonus = Boolean(provider.depositTiers?.length);
  const { isAuthenticated } = useAuth();
  const { open: openAuth } = useAuthModal();
  const [action, setAction] = useState<Action>('idle');

  const launch = (kind: Exclude<Action, 'idle'>) => {
    if (!isAuthenticated) {
      openAuth(kind === 'login' ? 'login' : 'register');
      return;
    }
    setAction(kind);
    window.setTimeout(() => {
      setAction('idle');
      window.open(provider.launchUrlTemplate, '_blank', 'noopener,noreferrer');
    }, 800);
  };

  const shortCode = provider.name.split(' ')[0].slice(0, 8).toUpperCase();

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-extrabold',
            isGC ? 'bg-amber-400/90 text-black' : 'bg-success/90 text-white'
          )}
        >
          {isGC ? <Star size={10} fill="currentColor" /> : <DollarSign size={10} />}
          {provider.providerType}
        </span>
        {hasBonus && (
          <span className="rounded-pill bg-danger/90 px-2 py-0.5 text-[10px] font-extrabold text-white">
            DAILY 1ST
          </span>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex w-16 shrink-0 flex-col items-center gap-1">
          <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-white/5">
            <Image
              src={provider.iconUrl}
              alt={provider.name}
              fill
              sizes="48px"
              className="object-cover"
              unoptimized
            />
          </div>
          <span className="line-clamp-1 text-center text-[9px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            {shortCode}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <p className="text-center text-sm font-bold">Select Login Method</p>
          <button
            onClick={() => launch('login')}
            disabled={action !== 'idle'}
            className="flex items-center justify-center gap-1.5 rounded-pill bg-brand-solid py-2 text-xs font-bold text-white shadow-glowBrand disabled:opacity-70"
          >
            {action === 'login' ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <UserRound size={13} />
            )}
            I have an Account
          </button>
          <button
            onClick={() => launch('create')}
            disabled={action !== 'idle'}
            className="flex items-center justify-center gap-1.5 rounded-pill border border-brand/40 bg-brand/10 py-2 text-xs font-bold text-brand disabled:opacity-70"
          >
            {action === 'create' ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            Auto Create Account
          </button>
        </div>
      </div>

      <p className="text-sm font-bold">{provider.name}</p>
    </Card>
  );
}
