import { getReferral } from '@/lib/data';
import { ShareActivity } from '@/components/game/ShareActivity';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Share & Earn · ${APP_NAME}` };

export default async function ShareActivityPage() {
  const referral = await getReferral();

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 lg:py-6">
      <ShareActivity referral={referral} />
    </div>
  );
}
