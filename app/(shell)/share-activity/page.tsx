import { getReferral } from '@/lib/data';
import { ShareActivity } from '@/components/game/ShareActivity';

export const metadata = { title: 'Share & Earn · Digit Link' };

export default async function ShareActivityPage() {
  const referral = await getReferral();

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 lg:py-6">
      <ShareActivity referral={referral} />
    </div>
  );
}
