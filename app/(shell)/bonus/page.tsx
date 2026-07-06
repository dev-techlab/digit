import { getBonuses } from '@/lib/data';
import { BonusHero } from '@/components/game/BonusHero';

export const metadata = { title: 'Bonus Center · Digit Link' };

export default async function BonusPage() {
  const bonuses = await getBonuses();

  return <BonusHero bonuses={bonuses} />;
}
