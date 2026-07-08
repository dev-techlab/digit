'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/nav';
import { cn } from '@/lib/cn';

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="glass fixed bottom-0 left-1/2 z-40 w-full max-w-[560px] -translate-x-1/2 border-t md:max-w-[720px] lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'nav-item flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors',
                active ? 'text-brand' : 'text-[var(--text-secondary)]'
              )}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.4 : 1.8}
                className={cn(active && 'drop-shadow-[0_0_8px_rgba(0,145,255,0.6)]')}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
