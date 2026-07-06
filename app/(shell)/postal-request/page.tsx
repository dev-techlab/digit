import { PostalRequestForm } from '@/components/orders/PostalRequestForm';

export const metadata = { title: 'Postal Request Code · Digit Link' };

export default function PostalRequestPage() {
  return (
    <div className="px-4 pt-4">
      <h1 className="mb-4 text-xl font-bold">Postal Request Code</h1>
      <PostalRequestForm />
    </div>
  );
}
