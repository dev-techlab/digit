import { AgentOrdersScreen } from '@/components/admin/screens/AgentOrdersScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Agent Orders · ${APP_NAME}` };

export default function Page() {
  return <AgentOrdersScreen />;
}
