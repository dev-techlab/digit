import { CustomerScreen } from '@/components/agent/screens/CustomerScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Customer List · ${APP_NAME}` };

export default function CustomersPage() {
  return <CustomerScreen />;
}
