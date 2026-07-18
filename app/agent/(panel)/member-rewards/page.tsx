import { MemberRewardsScreen } from '@/components/agent/screens/MemberRewardsScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Member Rewards · ${APP_NAME}` };

export default function Page() {
  return <MemberRewardsScreen />;
}
