import { ProvidersScreen } from '@/components/admin/screens/ProvidersScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Providers · ${APP_NAME}` };

export default function Page() {
  return <ProvidersScreen />;
}
