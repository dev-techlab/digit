'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from './ui';
import { DashboardScreen } from './screens/DashboardScreen';
import { WalletScreen } from './screens/WalletScreen';
import { GameSettingScreen } from './screens/GameSettingScreen';
import { AgentListScreen } from './screens/AgentListScreen';
import { MemberScreen } from './screens/MemberScreen';
import { KioskScreen } from './screens/KioskScreen';
import { PromotionScreen } from './screens/PromotionScreen';
import { StoreAdminScreen } from './screens/StoreAdminScreen';
import { TransactionScreen } from './screens/TransactionScreen';
import { CsConfigScreen } from './screens/CsConfigScreen';
import { TermsScreen } from './screens/TermsScreen';
import { PostersScreen } from './screens/PostersScreen';
import { ChangePasswordScreen } from './screens/ChangePasswordScreen';
import { MemberRewardsScreen } from './screens/MemberRewardsScreen';
import { TutorialScreen } from './screens/TutorialScreen';
import { DocPreviewScreen } from './screens/DocPreviewScreen';
import { NoticesScreen } from './screens/NoticesScreen';

export interface AgentMe {
  id: string;
  type: 'store' | 'sale' | 'sub';
  username: string;
  nickname: string | null;
  storeId: string;
  store?: { username: string; inviteCode: string; email: string | null };
}

type ScreenKey =
  | 'dashboard'
  | 'wallet'
  | 'game-setting'
  | 'sale-agents'
  | 'members'
  | 'sub-agents'
  | 'kiosks'
  | 'member-rewards'
  | 'promotions'
  | 'store-admins'
  | 'transactions'
  | 'cs-config'
  | 'terms'
  | 'posters'
  | 'tutorial'
  | 'doc-preview'
  | 'notices'
  | 'change-password';

const SCREENS: Record<ScreenKey, { title: string; render: () => JSX.Element }> = {
  dashboard: { title: 'Dashboard', render: () => <DashboardScreen /> },
  wallet: { title: 'My Wallet', render: () => <WalletScreen /> },
  'game-setting': { title: 'Game Setting', render: () => <GameSettingScreen /> },
  'sale-agents': { title: 'Sale Agent List', render: () => <AgentListScreen type="sale" /> },
  members: { title: 'Member List', render: () => <MemberScreen /> },
  'sub-agents': { title: 'Sub Agent List', render: () => <AgentListScreen type="sub" /> },
  kiosks: { title: 'Kiosk List', render: () => <KioskScreen /> },
  'member-rewards': { title: 'Member Rewards', render: () => <MemberRewardsScreen /> },
  promotions: { title: 'Promotion Config', render: () => <PromotionScreen /> },
  'store-admins': { title: 'Store Administrator', render: () => <StoreAdminScreen /> },
  transactions: { title: 'Transaction List', render: () => <TransactionScreen /> },
  'cs-config': { title: 'CS Config', render: () => <CsConfigScreen /> },
  terms: { title: 'Terms', render: () => <TermsScreen /> },
  posters: { title: 'Download posters', render: () => <PostersScreen /> },
  tutorial: { title: 'Tutorial', render: () => <TutorialScreen /> },
  'doc-preview': { title: 'Doc Preview', render: () => <DocPreviewScreen /> },
  notices: { title: 'My Notices', render: () => <NoticesScreen /> },
  'change-password': { title: 'Change Password', render: () => <ChangePasswordScreen /> },
};

const PanelCtx = createContext<{ me: AgentMe; open: (k: ScreenKey) => void } | null>(null);
export const usePanel = () => {
  const ctx = useContext(PanelCtx);
  if (!ctx) throw new Error('usePanel outside provider');
  return ctx;
};

export function AgentPanel() {
  const router = useRouter();
  const [me, setMe] = useState<AgentMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabs, setTabs] = useState<ScreenKey[]>(['dashboard']);
  const [active, setActive] = useState<ScreenKey>('dashboard');
  const [accountOpen, setAccountOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false); // desktop mini-sidebar
  const [mobileNav, setMobileNav] = useState(false); // <lg overlay drawer
  const [bellOpen, setBellOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    api<AgentMe>('/api/agent/me')
      .then(setMe)
      .catch(() => router.replace('/admin/login'))
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

  const open = (key: ScreenKey) => {
    setTabs((t) => (t.includes(key) ? t : [...t, key]));
    setActive(key);
    setMobileNav(false);
  };
  const close = (key: ScreenKey) => {
    if (key === 'dashboard') return;
    setTabs((t) => {
      const next = t.filter((k) => k !== key);
      if (active === key) setActive(next[next.length - 1] ?? 'dashboard');
      return next;
    });
  };

  const logout = async () => {
    await fetch('/api/agent/logout', { method: 'POST' });
    router.replace('/admin/login');
  };

  const ctx = useMemo(() => (me ? { me, open } : null), [me]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-sm text-slate-400">
        Loading…
      </div>
    );
  }
  if (!me || !ctx) return null;

  const NavItem = ({
    icon: Icon,
    label,
    screen,
    onClick,
    activeMatch,
    indent,
  }: {
    icon: LucideIcon;
    label: string;
    screen?: ScreenKey;
    onClick?: () => void;
    activeMatch?: boolean;
    indent?: boolean;
  }) => (
    <button
      onClick={onClick ?? (screen ? () => open(screen) : undefined)}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-[15px] transition',
        indent && !collapsed && 'pl-11',
        (activeMatch ?? (screen && active === screen))
          ? 'bg-blue-50 font-medium text-blue-500'
          : 'text-slate-600 hover:bg-slate-50'
      )}
      title={label}
    >
      <Icon size={18} />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );

  const sidebarNav = (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-4">
      <NavItem icon={Home} label="Dashboard" screen="dashboard" />
      <NavItem icon={Wallet} label="My Wallet" screen="wallet" />
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
          <NavItem indent icon={Gamepad2} label="Game Setting" screen="game-setting" />
          <NavItem indent icon={UserRound} label="Sale Agent List" screen="sale-agents" />
          <NavItem indent icon={Wine} label="Member List" screen="members" />
          <NavItem indent icon={UserRound} label="Sub Agent List" screen="sub-agents" />
          <NavItem indent icon={Monitor} label="Kiosk List" screen="kiosks" />
          <NavItem indent icon={Trophy} label="Member Rewards" screen="member-rewards" />
        </div>
      )}
      <NavItem icon={Gift} label="Promotion Config" screen="promotions" />
      <NavItem icon={UserCircle} label="Store Administrator" screen="store-admins" />
      <NavItem icon={FolderClosed} label="Transaction List" screen="transactions" />
      <NavItem icon={Settings} label="CS Config" screen="cs-config" />
      <NavItem icon={FileText} label="Terms" screen="terms" />
      <NavItem icon={Camera} label="Download posters" screen="posters" />
      <NavItem icon={PlayCircle} label="Tutorial" screen="tutorial" />
      <NavItem icon={BookOpen} label="Doc Preview" screen="doc-preview" />
      <NavItem icon={Lock} label="Change Password" screen="change-password" />
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
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-400 to-green-600 text-base font-bold text-white">
        D
      </span>
      {!collapsed && <span className="text-lg font-bold text-slate-800">Digit Link</span>}
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
                  <button
                    onClick={() => {
                      setBellOpen(false);
                      open('notices');
                    }}
                    className="block w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-medium text-blue-500 hover:bg-slate-50"
                  >
                    View More ›
                  </button>
                </div>
              )}
              <span className="max-w-32 truncate text-base font-bold text-slate-800 sm:max-w-none">
                {me.username}
              </span>
            </div>
          </header>

          {/* Chip tab bar — scrolls horizontally when it overflows */}
          <div className="flex items-center gap-2 overflow-x-auto px-4 pt-3 sm:px-5 [scrollbar-width:none]">
            {tabs.map((key) => (
              <span
                key={key}
                className={cn(
                  'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition',
                  active === key
                    ? 'bg-blue-500 font-medium text-white'
                    : 'border border-slate-200 bg-white text-slate-500 hover:text-slate-700'
                )}
                onClick={() => setActive(key)}
              >
                {SCREENS[key].title}
                {key !== 'dashboard' && (
                  <X
                    size={13}
                    onClick={(e) => {
                      e.stopPropagation();
                      close(key);
                    }}
                  />
                )}
              </span>
            ))}
          </div>

          <main className="min-w-0 flex-1 p-3 sm:p-5">{SCREENS[active].render()}</main>

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
