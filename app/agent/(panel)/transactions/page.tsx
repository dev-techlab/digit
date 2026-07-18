import { TransactionScreen } from '@/components/agent/screens/TransactionScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Transaction List · ${APP_NAME}` };

export default function Page() {
  return <TransactionScreen />;
}
