import { DashboardScreen } from '@/components/agent/screens/DashboardScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Dashboard · ${APP_NAME}` };

export default function Page() {
  return <DashboardScreen />;
}
