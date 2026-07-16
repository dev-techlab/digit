import { AgentPanel } from '@/components/agent/AgentPanel';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Agent Panel · ${APP_NAME}` };

export default function AdminPage() {
  return <AgentPanel />;
}
