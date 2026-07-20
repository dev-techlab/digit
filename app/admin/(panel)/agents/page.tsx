import { AgentsScreen } from '@/components/admin/screens/AgentsScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Agents · ${APP_NAME}` };

export default function Page() {
  return <AgentsScreen />;
}
