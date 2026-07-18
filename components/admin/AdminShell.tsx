'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Gamepad2,
  Layers,
  Lock,
  Power,
  X,
  IndentDecrease,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { APP_NAME } from '@/lib/constants';
import { BrandLoader } from '@/components/shell/BrandLoader';
import { api } from '@/components/agent/ui';

export interface AdminMe {
  adminId: string;
  isSuperAdmin: boolean;
  permissions: string[];
}

const TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  providers: 'Providers',
  platforms: 'Platforms',
};

const AdminCtx = createContext<{ me: AdminMe } | null>(null);
export const useAdminPanel = () => {
  const ctx = useContext(AdminCtx);
  if (!ctx) throw new Error('useAdminPanel outside provider');
  return ctx;
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    api<AdminMe>('/api/admin/me')
      .then(setMe)
      .catch(() => router.replace('/admin/login'))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const { body, documentElement: html } = document;
    const prev = {
      maxWidth: body.style.maxWidth,
      margin: body.style.margin,
      bodyBg: body.style.background,
      htmlBg: html.style.background,
    };
    body.style.maxWidth = 'none';
    body.style.margin = '0';
    body.style.background = '#f5f6fa';
    html.style.background = '#f5f6fa';
    return () => {
      body.style.maxWidth = prev.maxWidth;
      body.style.margin = prev.margin;
      body.style.background = prev.bodyBg;
      html.style.background = prev.htmlBg;
    };
  }, []);

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
  };

  const ctx = useMemo(() => (me ? { me } : null), [me]);

  if (loading) return <BrandLoader />;
  if (!me || !ctx) return null;

  const segment = pathname.split('/').filter(Boolean).pop() ?? 'dashboard';
  const title = TITLES[segment] ?? 'Dashboard';

  const NavItem = ({
    icon: Icon,
    label,
    href,
    onClick,
  }: {
    icon: LucideIcon;
    label: string;
    href?: string;
    onClick?: () => void;
  }) => {
    const active = href ? pathname === href : false;
    const className = cn(
      'flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-[15px] transition',
      active ? 'bg-blue-50 font-medium text-blue-500' : 'text-slate-600 hover:bg-slate-50'
    );
    const content = (
      <>
        <Icon size={18} />
        {!collapsed && <span className="truncate">{label}</span>}
      </>
    );
    if (href) {
      return (
        <Link href={href} className={className} title={label} onClick={() => setMobileNav(false)}>
          {content}
        </Link>
      );
    }
    return (
      <button onClick={onClick} className={className} title={label}>
        {content}
      </button>
    );
  };

  const sidebarNav = (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-4">
      <NavItem icon={Home} label="Dashboard" href="/admin/dashboard" />
      <NavItem icon={Gamepad2} label="Providers" href="/admin/providers" />
      <NavItem icon={Layers} label="Platforms" href="/admin/platforms" />
      <div className="my-3 border-t border-slate-100" />
      <NavItem icon={Lock} label="Change Password" href="/admin/change-password" />
      <NavItem icon={Power} label="Logout" onClick={logout} />
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2.5 px-5 py-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-base font-bold text-white">
        {APP_NAME[0]}
      </span>
      {!collapsed && <span className="text-lg font-bold text-slate-800">{APP_NAME} Admin</span>}
    </div>
  );

  return (
    <AdminCtx.Provider value={ctx}>
      <div className="flex min-h-dvh bg-[#f5f6fa] text-slate-700" style={{ colorScheme: 'light' }}>
        <aside
          className={cn(
            'sticky top-0 hidden h-dvh flex-col border-r border-slate-100 bg-white transition-all lg:flex',
            collapsed ? 'w-16' : 'w-64'
          )}
        >
          {brand}
          {sidebarNav}
        </aside>

        {mobileNav && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileNav(false)}
              aria-hidden
            />
            <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-xl">
              <div className="flex items-center justify-between pr-3">
                {brand}
                <button
                  onClick={() => setMobileNav(false)}
                  className="rounded-md p-2 text-slate-400 hover:bg-slate-50"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>
              {sidebarNav}
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
            <button
              onClick={() => {
                if (window.innerWidth < 1024) setMobileNav(true);
                else setCollapsed((v) => !v);
              }}
              className="text-slate-500 hover:text-slate-700"
              aria-label="Toggle navigation"
            >
              <IndentDecrease size={20} />
            </button>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              {me.isSuperAdmin && (
                <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600">
                  <ShieldCheck size={13} /> Super Admin
                </span>
              )}
              <span>{me.adminId.slice(0, 8)}</span>
            </div>
          </header>

          <div className="flex items-center gap-2 overflow-x-auto px-4 pt-3 [scrollbar-width:none] sm:px-5">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white">
              {title}
            </span>
          </div>

          <main className="min-w-0 flex-1 p-3 sm:p-5">{children}</main>
        </div>
      </div>
    </AdminCtx.Provider>
  );
}
