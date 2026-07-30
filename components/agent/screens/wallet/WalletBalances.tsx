'use client';

import { useState } from 'react';
import { Wallet, Coins, Copy, Check, Mail } from 'lucide-react';
import { api, Btn, Card, fmtMoney } from '@/components/agent/ui';

interface WalletBalancesProps {
  data: {
    store: {
      email: string | null;
      inviteCode: string;
      onlineBalance: string;
      tipsBalance: string;
    };
  };
  inviteLink: string;
  onClearTips: () => Promise<void>;
  onEmailChange: () => void;
}

function maskEmail(email: string | null) {
  if (!email) return '-';
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}***@${domain ?? ''}`;
}

export function WalletBalances({
  data,
  inviteLink,
  onClearTips,
  onEmailChange,
}: WalletBalancesProps) {
  const [copied, setCopied] = useState(false);

  return (
    <Card>
      <div className="flex flex-wrap gap-4">
        <div className="flex w-full items-center gap-4 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-5 text-white sm:w-64">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <Wallet size={22} />
          </span>
          <div>
            <p className="text-sm opacity-80">Online Balance</p>
            <p className="text-2xl font-bold">{fmtMoney(data.store.onlineBalance)}</p>
          </div>
        </div>
        <div className="relative flex w-full items-center gap-4 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 p-5 text-white sm:w-64">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <Coins size={22} />
          </span>
          <div>
            <p className="text-sm opacity-80">Tips</p>
            <p className="text-2xl font-bold">{fmtMoney(data.store.tipsBalance)}</p>
          </div>
          <button
            onClick={onClearTips}
            className="absolute right-3 top-3 rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-medium hover:bg-white/40"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="mt-5 space-y-2 text-sm">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-600">Email:</span>
          <Mail size={15} className="text-blue-400" />
          <span className="font-semibold text-blue-500">{maskEmail(data.store.email)}</span>
          <Btn className="px-3 py-1 text-xs" onClick={onEmailChange}>
            Change Email
          </Btn>
        </p>
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-600">Invite Link:</span>
          <span className="break-all text-slate-700">{inviteLink}</span>
          <button
            className="rounded border border-blue-200 bg-blue-50 p-1.5 text-blue-400 hover:text-blue-600"
            onClick={async () => {
              await navigator.clipboard.writeText(inviteLink);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            aria-label="Copy invite link"
          >
            {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
          </button>
        </p>
        <p className="rounded-lg bg-amber-50 px-4 py-2.5 text-amber-700">
          You only need to send the link to your users, and they can register their own member
          accounts.
        </p>
      </div>
    </Card>
  );
}
