import { BonusCard } from './BonusCard';
import type { BonusReward } from '@/lib/types';

export function BonusList({ bonuses }: { bonuses: BonusReward[] }) {
  if (bonuses.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-[var(--text-secondary)]">
        No bonuses available right now.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {bonuses.map((bonus) => (
        <BonusCard key={bonus.id} bonus={bonus} />
      ))}
    </div>
  );
}
