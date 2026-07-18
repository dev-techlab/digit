import { AgentShell } from '@/components/agent/AgentShell';

export default function AgentPanelLayout({ children }: { children: React.ReactNode }) {
  return <AgentShell>{children}</AgentShell>;
}
