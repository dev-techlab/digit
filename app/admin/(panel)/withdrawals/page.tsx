import { WithdrawalsScreen } from '@/components/admin/screens/WithdrawalsScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Withdrawals · ${APP_NAME}` };

export default function Page() {
  return <WithdrawalsScreen />;
}
