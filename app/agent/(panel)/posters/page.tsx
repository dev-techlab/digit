import { PostersScreen } from '@/components/agent/screens/PostersScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Download posters · ${APP_NAME}` };

export default function Page() {
  return <PostersScreen />;
}
