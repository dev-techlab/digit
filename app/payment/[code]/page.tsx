import Link from 'next/link';
import { CheckCircle2, XCircle, Clock, HelpCircle } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { db } from '@/lib/db';

export const metadata = { title: `Payment Result · ${APP_NAME}` };

type Status = 'success' | 'failed' | 'pending' | 'unknown';

/** Resolve the real order/transaction behind this reference — never guess from the URL text. */
async function resolveStatus(code: string): Promise<Status> {
  const order = await db.query.orders.findFirst({ where: (t, { eq }) => eq(t.orderNo, code) });
  if (order) {
    if (order.status === 'completed') return 'success';
    if (order.status === 'pending') return 'pending';
    return 'failed'; // failed | cancelled
  }

  const tx = await db.query.transactions.findFirst({ where: (t, { eq }) => eq(t.id, code) });
  if (tx) {
    if (tx.status === 'completed') return 'success';
    if (tx.status === 'pending') return 'pending';
    return 'failed'; // failed | cancelled
  }

  return 'unknown';
}

const CONTENT = {
  success: {
    icon: CheckCircle2,
    color: 'text-success',
    bg: 'bg-success/15',
    title: 'Payment Successful',
    body: 'Your deposit has been received and your balance will update shortly.',
  },
  pending: {
    icon: Clock,
    color: 'text-warning',
    bg: 'bg-warning/15',
    title: 'Payment Pending',
    body: 'We’re still confirming your payment. This can take a few minutes.',
  },
  failed: {
    icon: XCircle,
    color: 'text-danger',
    bg: 'bg-danger/15',
    title: 'Payment Failed',
    body: 'Something went wrong processing your payment. No funds were deducted.',
  },
  unknown: {
    icon: HelpCircle,
    color: 'text-[var(--text-secondary)]',
    bg: 'bg-[var(--divider-color)]',
    title: 'Payment Not Found',
    body: "We couldn't find a payment matching this reference. If funds left your account, please contact support.",
  },
} as const;

export default async function PaymentResultPage({ params }: { params: { code: string } }) {
  const status = await resolveStatus(params.code);
  const { icon: Icon, color, bg, title, body } = CONTENT[status];

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className={`flex h-16 w-16 items-center justify-center rounded-full ${bg} ${color}`}>
        <Icon size={30} />
      </div>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="max-w-xs text-sm text-[var(--text-secondary)]">{body}</p>
      <p className="text-xs text-[var(--text-secondary)]">Reference: {params.code}</p>
      <Link href="/orders" className="text-sm font-semibold text-brand">
        View Order History
      </Link>
    </div>
  );
}
