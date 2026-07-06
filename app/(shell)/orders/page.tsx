import { getTransactions } from '@/lib/data';
import { TransactionsView } from '@/components/orders/TransactionsView';
import { PageHeader } from '@/components/shell/PageHeader';

export const metadata = { title: 'Transactions · Digit Link' };

export default async function OrdersPage({ searchParams }: { searchParams: { type?: string } }) {
  const transactions = await getTransactions();
  const initialType = searchParams.type === 'withdraw' ? 'withdraw' : 'deposit';

  return (
    <div className="px-4 pt-4">
      <PageHeader title="Transactions" />
      <TransactionsView transactions={transactions} initialType={initialType} />
    </div>
  );
}
