import { PlatformCatalogScreen } from '@/components/agent/screens/PlatformCatalogScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Game Platforms · ${APP_NAME}` };

export default function Page() {
  return <PlatformCatalogScreen />;
}
