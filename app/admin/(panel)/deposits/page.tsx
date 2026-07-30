import { DepositsScreen } from '@/components/admin/screens/DepositsScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Deposits · ${APP_NAME}` };

export default function Page() {
  return <DepositsScreen />;
}
