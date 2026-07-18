import { getReferral } from '@/lib/data';
import { ShareActivity } from '@/components/game/ShareActivity';
import { RequireAuth } from '@/components/shell/RequireAuth';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Share & Earn · ${APP_NAME}` };

export default async function ShareActivityPage() {
  const referral = await getReferral();

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 lg:py-6">
      <RequireAuth title="Sign in required" body="Sign in to invite friends and track your rewards.">
        <ShareActivity referral={referral} />
      </RequireAuth>
    </div>
  );
}
