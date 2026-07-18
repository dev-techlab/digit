import { WalletScreen } from '@/components/agent/screens/WalletScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `My Wallet · ${APP_NAME}` };

export default function Page() {
  return <WalletScreen />;
}
