import { StoreAdminScreen } from '@/components/agent/screens/StoreAdminScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Store Administrator · ${APP_NAME}` };

export default function Page() {
  return <StoreAdminScreen />;
}
