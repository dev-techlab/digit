import { UsersScreen } from '@/components/admin/screens/UsersScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Users · ${APP_NAME}` };

export default function Page() {
  return <UsersScreen />;
}
