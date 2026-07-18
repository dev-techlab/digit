import { PromotionScreen } from '@/components/agent/screens/PromotionScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Promotion Config · ${APP_NAME}` };

export default function Page() {
  return <PromotionScreen />;
}
