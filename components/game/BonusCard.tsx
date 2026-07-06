'use client';

import { useState } from 'react';
import { ImageIcon, Coins, Percent, Calendar, Clock, Gift, Lock, Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { useCountdown } from '@/lib/use-countdown';
import type { BonusReward } from '@/lib/types';

export function BonusCard({ bonus }: { bonus: BonusReward }) {
  const [claimed, setClaimed] = useState(bonus.status === 'claimed');
  const countdown = useCountdown(bonus.schedule.countdownSeconds);
  const scheduleText = bonus.schedule.countdownSeconds ? countdown : bonus.schedule.text;
  const ScheduleIcon = bonus.schedule.icon === 'clock' ? Clock : Calendar;

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-3 pb-0">
        <div className="flex flex-wrap gap-1.5">
          {bonus.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-pill bg-black/40 px-2.5 py-1 text-[10px] font-bold tracking-wide text-[var(--text-secondary)]"
            >
              {tag}
            </span>
          ))}
        </div>
        {bonus.active && (
          <span className="flex items-center gap-1 rounded-pill bg-black/40 px-2.5 py-1 text-[10px] font-bold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Active
          </span>
        )}
      </div>

      <div className="relative m-3 flex h-40 items-center justify-center overflow-hidden rounded-lg">
        {bonus.banner.type === 'gradient' ? (
          <div className={cn('absolute inset-0 bg-gradient-to-br', bonus.banner.gradient)} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-white/5">
            <ImageIcon size={32} className="text-[var(--text-secondary)]/40" />
          </div>
        )}
        {bonus.banner.type === 'gradient' && bonus.banner.badgeText && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-pill bg-black/50 px-2.5 py-1 text-xs font-bold text-white">
            {bonus.banner.badgeIcon === 'coin' ? <Coins size={12} /> : <Percent size={12} />}
            {bonus.banner.badgeText}
          </span>
        )}
      </div>

      <div className="px-4 pb-4">
        <p className="text-sm font-bold">{bonus.title}</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{bonus.description}</p>

        <div className="my-3 h-px bg-[var(--divider-color)]" />

        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <ScheduleIcon size={13} />
          {scheduleText}
        </div>

        {bonus.status !== 'none' && (
          <button
            disabled={claimed || bonus.status === 'locked'}
            onClick={() => setClaimed(true)}
            className={cn(
              'mt-3 flex w-full items-center justify-center gap-2 rounded-pill py-3 text-sm font-bold transition-opacity',
              claimed || bonus.status === 'locked'
                ? 'bg-white/10 text-[var(--text-secondary)]'
                : 'bg-gradient-to-r from-brand-solid to-amber-400 text-black shadow-glowBrand'
            )}
          >
            {bonus.status === 'locked' ? (
              <Lock size={15} />
            ) : claimed ? (
              <Check size={15} />
            ) : (
              <Gift size={15} />
            )}
            {bonus.status === 'locked' ? 'Locked' : claimed ? 'Claimed' : 'Claim Reward'}
          </button>
        )}
      </div>
    </Card>
  );
}
