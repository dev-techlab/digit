import { TutorialScreen } from '@/components/agent/screens/TutorialScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Tutorial · ${APP_NAME}` };

export default function Page() {
  return <TutorialScreen />;
}
