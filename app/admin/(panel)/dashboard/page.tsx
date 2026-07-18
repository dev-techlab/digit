import { DashboardScreen } from '@/components/admin/screens/DashboardScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Admin Dashboard · ${APP_NAME}` };

export default function Page() {
  return <DashboardScreen />;
}
