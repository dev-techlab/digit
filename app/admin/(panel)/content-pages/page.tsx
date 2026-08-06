import { ContentPagesScreen } from '@/components/admin/screens/ContentPagesScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Content Pages · ${APP_NAME}` };

export default function Page() {
  return <ContentPagesScreen />;
}
