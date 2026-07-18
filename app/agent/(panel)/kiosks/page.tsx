import { KioskScreen } from '@/components/agent/screens/KioskScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Kiosk List · ${APP_NAME}` };

export default function Page() {
  return <KioskScreen />;
}
