import { TermsScreen } from '@/components/agent/screens/TermsScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Terms · ${APP_NAME}` };

export default function Page() {
  return <TermsScreen />;
}
