import { AdminLoginView } from '@/components/admin/AdminLoginView';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Admin Login · ${APP_NAME}` };

export default function AdminLoginPage() {
  return <AdminLoginView />;
}
