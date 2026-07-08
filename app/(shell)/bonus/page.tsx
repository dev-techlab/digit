import { getBonuses } from '@/lib/data';
import { BonusHero } from '@/components/game/BonusHero';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Bonus Center · ${APP_NAME}` };

export default async function BonusPage() {
  const bonuses = await getBonuses();

  return <BonusHero bonuses={bonuses} />;
}
