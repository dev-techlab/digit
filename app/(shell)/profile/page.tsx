import { getWallet } from '@/lib/data';
import { ProfileView } from '@/components/profile/ProfileView';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Profile · ${APP_NAME}` };

export default async function ProfilePage() {
  const wallet = await getWallet();
  return <ProfileView wallet={wallet} />;
}
