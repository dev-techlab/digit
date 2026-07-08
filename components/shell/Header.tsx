'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { BalanceCapsule } from '@/components/wallet/BalanceCapsule';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/lib/auth-context';
import type { WalletBalance } from '@/lib/types';
import { APP_NAME } from '@/lib/constants';

export function Header({ wallet }: { wallet: WalletBalance }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();

  const trigger = (extra: string) => (
    <button
      onClick={() => setSidebarOpen(true)}
      aria-label="Open account menu"
      className={`rounded-full text-[var(--text-primary)] hover:bg-white/10 ${extra}`}
    >
      {isAuthenticated && user ? (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-solid text-base">
          {user.avatarEmoji}
        </span>
      ) : (
        <Menu size={20} />
      )}
    </button>
  );

  return (
    <>
      <header
        className="header-bar sticky top-0 z-30 flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3 backdrop-blur-glass md:px-6 lg:justify-end lg:px-8"
        style={{ background: 'var(--header-bar-scrim)' }}
      >
        {/* Mobile / tablet: left-side account trigger */}
        {trigger('p-1.5 lg:hidden')}
        <span className="text-sm font-black uppercase tracking-wide text-[var(--text-primary)] lg:hidden">
          {APP_NAME}
        </span>
        <div className="flex items-center gap-2 lg:gap-3">
          <BalanceCapsule wallet={wallet} />
          {/* Desktop: account trigger next to the balance capsule */}
          {isAuthenticated && user && trigger('hidden p-0.5 lg:inline-flex')}
        </div>
      </header>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} wallet={wallet} />
    </>
  );
}
