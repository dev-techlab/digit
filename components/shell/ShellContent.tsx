'use client';

import { ReactNode } from 'react';
import { Header } from './Header';
import { RewardCenter } from './RewardCenter';
import { useSidebar } from '@/lib/sidebar-context';
import { cn } from '@/lib/cn';
import type { WalletBalance } from '@/lib/types';

export function ShellContent({
  wallet,
  footer,
  children,
}: {
  wallet: WalletBalance;
  footer: ReactNode;
  children: ReactNode;
}) {
  const { collapsed } = useSidebar();

  return (
    <div
      className={cn(
        'transition-[margin] duration-200',
        collapsed ? 'lg:ml-[72px]' : 'lg:ml-[220px]'
      )}
    >
      <RewardCenter />
      <Header wallet={wallet} />
      <main className="pb-24 lg:mx-auto lg:px-8 lg:pb-12 lg:pt-6">{children}</main>
      <div className="lg:mx-auto lg:max-w-5xl lg:px-8">{footer}</div>
    </div>
  );
}
