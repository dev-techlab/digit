import { getTransactions } from '@/lib/data';
import { TransactionsView } from '@/components/orders/TransactionsView';
import { PageHeader } from '@/components/shell/PageHeader';
import { RequireAuth } from '@/components/shell/RequireAuth';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Transactions · ${APP_NAME}` };

export default async function OrdersPage({ searchParams }: { searchParams: { type?: string } }) {
  const transactions = await getTransactions();
  const initialType = searchParams.type === 'withdraw' ? 'withdraw' : 'deposit';

  return (
    <div className="px-4 pt-4">
      <PageHeader title="Transactions" />
      <RequireAuth title="Sign in required" body="Sign in to view your transaction history.">
        <TransactionsView transactions={transactions} initialType={initialType} />
      </RequireAuth>
    </div>
  );
}
