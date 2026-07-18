import { DocPreviewScreen } from '@/components/agent/screens/DocPreviewScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Doc Preview · ${APP_NAME}` };

export default function Page() {
  return <DocPreviewScreen />;
}
