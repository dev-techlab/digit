import { PostalRequestForm } from '@/components/orders/PostalRequestForm';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Postal Request Code · ${APP_NAME}` };

export default function PostalRequestPage() {
  return (
    <div className="px-4 pt-4">
      <h1 className="mb-4 text-xl font-bold">Postal Request Code</h1>
      <PostalRequestForm />
    </div>
  );
}
