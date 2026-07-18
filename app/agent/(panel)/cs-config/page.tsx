import { CsConfigScreen } from '@/components/agent/screens/CsConfigScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `CS Config · ${APP_NAME}` };

export default function Page() {
  return <CsConfigScreen />;
}
