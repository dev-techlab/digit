import Link from 'next/link';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

export const metadata = { title: 'Payment Result · Digit Link' };

function resolveStatus(code: string): 'success' | 'failed' | 'pending' {
  if (code.toLowerCase().includes('fail')) return 'failed';
  if (code.toLowerCase().includes('pending')) return 'pending';
  return 'success';
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
} as const;

export default function PaymentResultPage({ params }: { params: { code: string } }) {
  const status = resolveStatus(params.code);
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
