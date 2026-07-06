'use client';

import { useState } from 'react';
import { DollarSign, Bitcoin, Zap, Landmark, CreditCard, type LucideIcon } from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/lib/cn';
import type { Transaction, TransactionMethod } from '@/lib/types';

const METHOD_ICON: Record<TransactionMethod, LucideIcon> = {
  cashapp: DollarSign,
  btc: Bitcoin,
  lightning: Zap,
  pyusd: DollarSign,
  ach: Landmark,
  card: CreditCard,
  chime: DollarSign,
};

const METHOD_STYLE: Record<TransactionMethod, string> = {
  cashapp: 'bg-[#00d54b] text-white',
  btc: 'bg-[#f7931a] text-white',
  lightning: 'bg-[#f7931a] text-white',
  pyusd: 'bg-[#0070ba] text-white',
  ach: 'bg-info text-white',
  card: 'bg-info text-white',
  chime: 'bg-[#1ec677] text-white',
};

const STATUS_LABEL: Record<Transaction['status'], string> = {
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

/** Masks the middle of an address, keeping the head and tail visible. */
function maskAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}…${address.slice(-5)}`;
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const Icon = METHOD_ICON[tx.method];
  const isDeposit = tx.type === 'deposit';

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-white/[0.03] p-4">
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          METHOD_STYLE[tx.method]
        )}
      >
        <Icon size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm font-semibold text-[var(--text-primary)]">
          {maskAddress(tx.address)}
        </p>
        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
          {tx.methodLabel} - {STATUS_LABEL[tx.status]}
        </p>
        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{tx.createTime}</p>
      </div>
      <p
        className={cn(
          'shrink-0 font-mono text-sm font-bold',
          isDeposit ? 'text-success' : 'text-[var(--text-primary)]'
        )}
      >
        {isDeposit ? '+' : '-'}${tx.amount}
      </p>
    </div>
  );
}

export function TransactionsView({
  transactions,
  initialType = 'deposit',
}: {
  transactions: Transaction[];
  initialType?: 'deposit' | 'withdraw';
}) {
  const [tab, setTab] = useState<'deposit' | 'withdraw'>(initialType);
  const rows = transactions.filter((t) => t.type === tab);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Tabs
        className="mx-auto max-w-sm"
        value={tab}
        onChange={(v) => setTab(v as 'deposit' | 'withdraw')}
        options={[
          { value: 'deposit', label: 'Deposit' },
          { value: 'withdraw', label: 'Withdraw' },
        ]}
      />

      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--text-secondary)]">
          No {tab} transactions yet.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
        </div>
      )}
    </div>
  );
}
