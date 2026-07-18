import { PlatformsScreen } from '@/components/admin/screens/PlatformsScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Platforms · ${APP_NAME}` };

export default function Page() {
  return <PlatformsScreen />;
}
