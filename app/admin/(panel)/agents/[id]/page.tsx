import { AgentDetailsScreen } from '@/components/admin/screens/AgentDetailsScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Agent Details · ${APP_NAME}` };

export default function Page({ params }: { params: { id: string } }) {
  return <AgentDetailsScreen agentId={params.id} />;
}
