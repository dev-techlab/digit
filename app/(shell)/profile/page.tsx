import { getWallet } from '@/lib/data';
import { ProfileView } from '@/components/profile/ProfileView';

export const metadata = { title: 'Profile · Digit Link' };

export default async function ProfilePage() {
  const wallet = await getWallet();
  return <ProfileView wallet={wallet} />;
}
