'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { ChevronsLeft, ChevronsRight, Settings, LogOut } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/nav';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/lib/auth-modal-context';
import { useSidebar } from '@/lib/sidebar-context';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export function DesktopSidebar() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuth();
  const { open: openAuth } = useAuthModal();
  const { collapsed, toggle } = useSidebar();
  const { theme, setTheme } = useTheme();

  // next-themes only knows the theme after mount; render a stable label until
  // then so the server and first client render match (avoids hydration warning).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-[var(--card-border)] py-4 transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[72px] px-2' : 'w-[220px] px-4'
      )}
      style={{ background: 'var(--drawer-bg)' }}
    >
      <div
        className={cn(
          'mb-5 flex items-center',
          collapsed ? 'flex-col gap-3' : 'justify-between px-1'
        )}
      >
        <Link href="/game" className="flex items-center gap-2 overflow-hidden">
          <Image
            src="https://digitlink.mobi/img/icons/icon-192x192.png"
            alt="Digit Link"
            width={28}
            height={28}
            unoptimized
            className="shrink-0 rounded-md"
          />
          {!collapsed && (
            <span className="truncate text-sm font-black uppercase tracking-wide">Digit Link</span>
          )}
        </Link>
        <button
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-white/10"
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      <Link
        href="/profile"
        className={cn(
          'mb-3 flex items-center gap-3 rounded-md bg-white/5 p-3 hover:bg-white/10',
          collapsed && 'justify-center px-2'
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-solid text-base">
          {isAuthenticated && user ? user.avatarEmoji : '👤'}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">
              {isAuthenticated && user ? user.nickname : 'Welcome!'}
            </p>
            <p className="truncate text-xs text-[var(--text-secondary)]">
              {isAuthenticated && user ? `@${user.username}` : 'Sign in to play'}
            </p>
          </div>
        )}
      </Link>

      {!isAuthenticated && (
        <Button
          variant="secondary"
          onClick={() => openAuth('login')}
          className={cn('mb-4 py-2 text-sm', collapsed && 'px-0')}
          fullWidth
        >
          {collapsed ? '↪' : 'Login'}
        </Button>
      )}

      <nav className="space-y-1">
        {NAV_ITEMS.filter((item) => item.href !== '/profile').map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                collapsed && 'justify-center px-0',
                active
                  ? 'bg-brand/10 text-brand'
                  : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]'
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2">
        {isAuthenticated && (
          <button
            onClick={logout}
            title="Logout"
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-danger hover:bg-danger/10',
              collapsed && 'justify-center px-0'
            )}
          >
            <LogOut size={16} />
            {!collapsed && 'Logout'}
          </button>
        )}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Toggle theme"
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-white/5',
            collapsed && 'justify-center px-0'
          )}
        >
          <Settings size={16} />
          {!collapsed && (mounted ? (theme === 'dark' ? 'Dark' : 'Light') : 'Theme')}
        </button>
      </div>
    </aside>
  );
}
