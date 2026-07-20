import { BonusesScreen } from '@/components/admin/screens/BonusesScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Bonuses · ${APP_NAME}` };

export default function Page() {
  return <BonusesScreen />;
}
