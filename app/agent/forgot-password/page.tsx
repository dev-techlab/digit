import { AgentForgotPasswordView } from '@/components/agent/AgentForgotPasswordView';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Agent Reset Password · ${APP_NAME}` };

export default function AgentForgotPasswordPage() {
  return <AgentForgotPasswordView />;
}
