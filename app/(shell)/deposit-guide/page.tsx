import { CreditCard, Bitcoin, Wallet, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const STEPS = [
  {
    icon: Wallet,
    title: '1. Open the Deposit panel',
    body: 'Tap your balance in the header, then choose "Deposit" to open the deposit panel.',
  },
  {
    icon: CreditCard,
    title: '2. Choose a payment method',
    body: 'Pick from Debit Card, Bitcoin On-Chain, Bitcoin Lightning Network, or PYUSD.',
  },
  {
    icon: Bitcoin,
    title: '3. Select an amount',
    body: 'Larger amounts unlock bigger bonus SC — the bonus is added automatically on top of your deposit.',
  },
  {
    icon: CheckCircle2,
    title: '4. Confirm & complete payment',
    body: 'Follow the on-screen instructions to finish payment. Your balance updates once the order clears — track it any time in Order History.',
  },
];

export const metadata = { title: 'Deposit Guide · Digit Link' };

export default function DepositGuidePage() {
  return (
    <div className="space-y-4 px-4 pt-4">
      <div>
        <h1 className="text-xl font-bold">How to Deposit</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Learn how to add funds to your account in a few simple steps.
        </p>
      </div>
      {STEPS.map(({ icon: Icon, title, body }) => (
        <Card key={title} className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
            <Icon size={18} />
          </div>
          <div>
            <p className="text-sm font-bold">{title}</p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{body}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
