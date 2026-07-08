import { AdminForgotPasswordView } from '@/components/admin/AdminForgotPasswordView';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Admin Reset Password · ${APP_NAME}` };

export default function AdminForgotPasswordPage() {
  return <AdminForgotPasswordView />;
}
