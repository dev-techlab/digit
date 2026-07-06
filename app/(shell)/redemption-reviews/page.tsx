import { getRedemptionReviews } from '@/lib/data';
import { RedemptionReviewList } from '@/components/orders/RedemptionReviewList';

export const metadata = { title: 'Redemption Reviews · Digit Link' };

export default async function RedemptionReviewsPage() {
  const reviews = await getRedemptionReviews();

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-4 text-xl font-bold">Redemption Reviews</h1>
      <RedemptionReviewList reviews={reviews} />
    </div>
  );
}
