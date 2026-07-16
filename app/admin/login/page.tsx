import { AgentLoginView } from '@/components/agent/AgentLoginView';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Agent Login · ${APP_NAME}` };

export default function AdminLoginPage() {
  return <AgentLoginView />;
}
