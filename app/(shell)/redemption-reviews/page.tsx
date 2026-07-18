import { getRedemptionReviews } from '@/lib/data';
import { RedemptionReviewList } from '@/components/orders/RedemptionReviewList';
import { RequireAuth } from '@/components/shell/RequireAuth';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Redemption Reviews · ${APP_NAME}` };

export default async function RedemptionReviewsPage() {
  const reviews = await getRedemptionReviews();

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-4 text-xl font-bold">Redemption Reviews</h1>
      <RequireAuth title="Sign in required" body="Sign in to view your redemption reviews.">
        <RedemptionReviewList reviews={reviews} />
      </RequireAuth>
    </div>
  );
}
