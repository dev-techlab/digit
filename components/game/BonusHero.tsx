'use client';

import { useState } from 'react';
import { Gift, Layers } from 'lucide-react';
import { BonusList } from './BonusList';
import type { BonusReward } from '@/lib/types';

export function BonusHero({ bonuses }: { bonuses: BonusReward[] }) {
  const [activeOnly, setActiveOnly] = useState(false);
  const visible = activeOnly ? bonuses.filter((b) => b.active) : bonuses;

  return (
    <div className="px-4 pt-6 md:px-0">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-solid shadow-glowBrand">
          <Gift size={30} className="text-white" />
        </div>
        <h1 className="mt-4 text-3xl font-black">Bonus Center</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Discover exclusive rewards and promotions
        </p>
        <button
          onClick={() => setActiveOnly((v) => !v)}
          className="mt-5 flex items-center gap-2 rounded-pill bg-black/30 px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-black/40"
        >
          <Layers size={15} />
          {activeOnly ? 'Active Only' : 'All Activities'}
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/15 px-1.5 text-xs font-bold">
            {visible.length}
          </span>
        </button>
      </div>

      <div className="mt-6">
        <BonusList bonuses={visible} />
      </div>
    </div>
  );
}
