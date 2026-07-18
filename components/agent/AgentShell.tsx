'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Wallet,
  Users,
  Gift,
  UserCircle,
  FolderClosed,
  Settings,
  FileText,
  Camera,
  PlayCircle,
  Lock,
  Power,
  Headphones,
  Bell,
  X,
  ChevronDown,
  Gamepad2,
  UserRound,
  Wine,
  Monitor,
  Trophy,
  IndentDecrease,
  BookOpen,
  Send,
  Plus,
  Smile,
  ChevronLeft,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { APP_NAME } from '@/lib/constants';
import { BrandLoader } from '@/components/shell/BrandLoader';
import { api } from './ui';

export interface AgentMe {
  id: string;
  type: 'store' | 'sale' | 'sub';
  username: string;
  nickname: string | null;
  storeId: string;
  store?: { username: string; inviteCode: string; email: string | null };
}

const TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  'my-wallet': 'My Wallet',
  'game-setting': 'Game Setting',
  'game-platforms': 'Game Platforms',
  'sale-agents': 'Sale Agent List',
  members: 'Member List',
  'sub-agents': 'Sub Agent List',
  kiosks: 'Kiosk List',
  'member-rewards': 'Member Rewards',
  promotions: 'Promotion Config',
  'store-admins': 'Store Administrator',
  transactions: 'Transaction List',
  'cs-config': 'CS Config',
  terms: 'Terms',
  posters: 'Download posters',
  tutorial: 'Tutorial',
  'doc-preview': 'Doc Preview',
  notices: 'My Notices',
  'change-password': 'Change Password',
};

const PanelCtx = createContext<{ me: AgentMe } | null>(null);
export const usePanel = () => {
  const ctx = useContext(PanelCtx);
  if (!ctx) throw new Error('usePanel outside provider');
  return ctx;
};

export function AgentShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<AgentMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountOpen, setAccountOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false); // desktop mini-sidebar
  const [mobileNav, setMobileNav] = useState(false); // <lg overlay drawer
  const [bellOpen, setBellOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    api<AgentMe>('/api/agent/me')
      .then(setMe)
      .catch(() => router.replace('/agent/login'))
      .finally(() => setLoading(false));
  }, [router]);

  // The player app caps <body> at 560/720px and paints it dark; the admin
  // panel needs the full viewport on a light background.
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
    await fetch('/api/agent/logout', { method: 'POST' });
    router.replace('/agent/login');
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
    activeMatch,
    indent,
  }: {
    icon: LucideIcon;
    label: string;
    href?: string;
    onClick?: () => void;
    activeMatch?: boolean;
    indent?: boolean;
  }) => {
    const active = activeMatch ?? (href ? pathname === href : false);
    const className = cn(
      'flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-[15px] transition',
      indent && !collapsed && 'pl-11',
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
      <NavItem icon={Home} label="Dashboard" href="/agent/dashboard" />
      <NavItem icon={Wallet} label="My Wallet" href="/agent/my-wallet" />
      <button
        onClick={() => setAccountOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-[15px] text-slate-600 hover:bg-slate-50"
        title="Account System"
      >
        <Users size={18} />
        {!collapsed && (
          <>
            <span className="flex-1">Account System</span>
            <ChevronDown
              size={15}
              className={cn('transition-transform', accountOpen && 'rotate-180')}
            />
          </>
        )}
      </button>
      {accountOpen && (
        <div className="space-y-0.5">
          <NavItem indent icon={Gamepad2} label="Game Setting" href="/agent/game-setting" />
          <NavItem indent icon={LayoutGrid} label="Game Platforms" href="/agent/game-platforms" />
          <NavItem indent icon={UserRound} label="Sale Agent List" href="/agent/sale-agents" />
          <NavItem indent icon={Wine} label="Member List" href="/agent/members" />
          <NavItem indent icon={UserRound} label="Sub Agent List" href="/agent/sub-agents" />
          <NavItem indent icon={Monitor} label="Kiosk List" href="/agent/kiosks" />
          <NavItem indent icon={Trophy} label="Member Rewards" href="/agent/member-rewards" />
        </div>
      )}
      <NavItem icon={Gift} label="Promotion Config" href="/agent/promotions" />
      <NavItem icon={UserCircle} label="Store Administrator" href="/agent/store-admins" />
      <NavItem icon={FolderClosed} label="Transaction List" href="/agent/transactions" />
      <NavItem icon={Settings} label="CS Config" href="/agent/cs-config" />
      <NavItem icon={FileText} label="Terms" href="/agent/terms" />
      <NavItem icon={Camera} label="Download posters" href="/agent/posters" />
      <NavItem icon={PlayCircle} label="Tutorial" href="/agent/tutorial" />
      <NavItem icon={BookOpen} label="Doc Preview" href="/agent/doc-preview" />
      <NavItem icon={Lock} label="Change Password" href="/agent/change-password" />
      <NavItem icon={Power} label="Logout" onClick={logout} />
      <div className="my-3 border-t border-slate-100" />
      <NavItem
        icon={Headphones}
        label="Customer Service"
        onClick={() => setChatOpen(true)}
        activeMatch={chatOpen}
      />
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2.5 px-5 py-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 text-base font-bold text-white">
        {APP_NAME[0]}
      </span>
      {!collapsed && <span className="text-lg font-bold text-slate-800">{APP_NAME}</span>}
    </div>
  );

  return (
    <PanelCtx.Provider value={ctx}>
      <div
        className="flex min-h-dvh bg-[#f5f6fa] text-slate-700"
        style={{ colorScheme: 'light' }}
      >
        {/* Desktop sidebar (≥lg) */}
        <aside
          className={cn(
            'sticky top-0 hidden h-dvh flex-col border-r border-slate-100 bg-white transition-all lg:flex',
            collapsed ? 'w-16' : 'w-64'
          )}
        >
          {brand}
          {sidebarNav}
        </aside>

        {/* Mobile / tablet overlay drawer (<lg) */}
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

        {/* Main */}
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
            <div className="relative flex items-center gap-4 sm:gap-5">
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative text-slate-500 hover:text-slate-700"
                aria-label="Notifications"
              >
                <Bell size={19} />
              </button>
              {bellOpen && (
                <div className="absolute right-0 top-9 z-40 w-72 rounded-xl border border-slate-100 bg-white shadow-lg">
                  <div className="flex flex-col items-center gap-1 px-4 py-8 text-slate-300">
                    <Bell size={32} strokeWidth={1.2} />
                    <p className="text-sm text-slate-400">No messages</p>
                  </div>
                  <Link
                    href="/agent/notices"
                    onClick={() => setBellOpen(false)}
                    className="block w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-medium text-blue-500 hover:bg-slate-50"
                  >
                    View More ›
                  </Link>
                </div>
              )}
              <span className="max-w-32 truncate text-base font-bold text-slate-800 sm:max-w-none">
                {me.username}
              </span>
            </div>
          </header>

          {/* Current page pill */}
          <div className="flex items-center gap-2 overflow-x-auto px-4 pt-3 sm:px-5 [scrollbar-width:none]">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white">
              {title}
            </span>
          </div>

          <main className="min-w-0 flex-1 p-3 sm:p-5">{children}</main>

          {/* Customer service chat (placeholder widget, like production SaleSmartly) */}
          {chatOpen && (
            <div className="fixed bottom-4 right-4 z-50 flex h-[70vh] max-h-[560px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl sm:bottom-8 sm:right-8">
              <div className="flex items-center justify-between bg-gradient-to-r from-blue-100 to-slate-50 px-4 py-3">
                <button className="text-slate-500" aria-label="Back" onClick={() => setChatOpen(false)}>
                  <ChevronLeft size={20} />
                </button>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400">
                  <UserRound size={18} />
                </span>
                <button
                  className="text-slate-500"
                  aria-label="Close chat"
                  onClick={() => setChatOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto bg-gradient-to-b from-blue-50/60 to-white p-4">
                <p className="mx-auto mt-6 max-w-60 text-center text-sm text-slate-400">
                  Customer service is online 24/7. Send us a message and we&apos;ll get back to you
                  right away.
                </p>
              </div>
              <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-2.5">
                <button className="text-slate-400" aria-label="Attach">
                  <Plus size={20} />
                </button>
                <button className="text-slate-400" aria-label="Emoji">
                  <Smile size={19} />
                </button>
                <input
                  placeholder="Type a message..."
                  className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none placeholder:text-slate-300 focus:border-blue-400"
                />
                <button
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white"
                  aria-label="Send"
                >
                  <Send size={15} />
                </button>
              </div>
              <p className="pb-2 text-center text-xs text-slate-300">Powered by SaleSmartly</p>
            </div>
          )}

          {/* Floating CS bubble */}
          {!chatOpen && (
            <button
              onClick={() => setChatOpen(true)}
              className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition hover:bg-green-600 sm:bottom-8 sm:right-8 sm:h-14 sm:w-14"
              aria-label="Customer service"
            >
              <Headphones size={22} />
            </button>
          )}
        </div>
      </div>
    </PanelCtx.Provider>
  );
}
