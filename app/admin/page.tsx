import { AdminDashboardView } from '@/components/admin/AdminDashboardView';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Admin · ${APP_NAME}` };

export default function AdminPage() {
  return <AdminDashboardView />;
}
