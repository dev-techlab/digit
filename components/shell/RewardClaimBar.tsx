'use client';

import { useEffect, useState } from 'react';
import { Gift, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { nextTask } from '@/lib/profile-tasks';
import { RewardBadges } from './RewardBadges';

/**
 * The gold "one step to claim" strip pinned above the header. The gift button
 * opens the profile-completion modal; the bar hides once every task is done or
 * the user dismisses it for the session.
 */
export function RewardClaimBar({ onOpen }: { onOpen: () => void }) {
  const { isAuthenticated, user } = useAuth();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(sessionStorage.getItem('reward-bar-dismissed') === '1');
  }, []);

  if (dismissed || !isAuthenticated || !user) return null;

  const next = nextTask(user);
  if (!next) return null;

  const dismiss = () => {
    sessionStorage.setItem('reward-bar-dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="relative z-[35] flex items-center gap-2.5 bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 px-4 py-2 text-black shadow-sm">
      <button
        onClick={onOpen}
        aria-label="Open profile rewards"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/10 transition-colors hover:bg-black/20"
      >
        <Gift size={18} />
      </button>
      <RewardBadges gc={next.rewardGc} sc={next.rewardSc} tone="onLight" />
      <button
        onClick={onOpen}
        className="truncate text-left text-sm font-semibold text-amber-950 hover:underline"
      >
        <span className="opacity-70">locked!</span> One step to claim.
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="ml-auto shrink-0 rounded-full p-1 text-black/60 transition-colors hover:bg-black/10"
      >
        <X size={16} />
      </button>
    </div>
  );
}
