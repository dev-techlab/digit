import { ChangePasswordScreen } from '@/components/agent/screens/ChangePasswordScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Change Password · ${APP_NAME}` };

export default function Page() {
  return <ChangePasswordScreen />;
}
