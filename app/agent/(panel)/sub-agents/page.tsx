import { AgentListScreen } from '@/components/agent/screens/AgentListScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Sub Agent List · ${APP_NAME}` };

export default function Page() {
  return <AgentListScreen type="sub" />;
}
