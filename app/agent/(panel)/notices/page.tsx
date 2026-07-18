import { NoticesScreen } from '@/components/agent/screens/NoticesScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `My Notices · ${APP_NAME}` };

export default function Page() {
  return <NoticesScreen />;
}
