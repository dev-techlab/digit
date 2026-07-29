import { SystemAdminsScreen } from '@/components/admin/screens/SystemAdminsScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `System Admins · ${APP_NAME}` };

export default function Page() {
  return <SystemAdminsScreen />;
}
