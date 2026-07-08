'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  X,
  Globe,
  Copy,
  Check,
  Pencil,
  Plus,
  Upload,
  Smartphone,
  Lock,
  Gift,
  FileText,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  Moon,
  Sun,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/lib/auth-modal-context';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ShopModal } from '@/components/wallet/ShopModal';
import { WithdrawModal } from '@/components/wallet/WithdrawModal';
import { AvatarEditorModal } from '@/components/profile/AvatarEditorModal';
import { BindPhoneModal } from '@/components/profile/BindPhoneModal';
import { ChangePasswordModal } from '@/components/profile/ChangePasswordModal';
import { LanguageModal } from '@/components/profile/LanguageModal';
import { cn } from '@/lib/cn';
import type { WalletBalance } from '@/lib/types';
import { APP_NAME } from '@/lib/constants';

type ModalKey =
  'deposit' | 'withdraw' | 'avatar' | 'bindPhone' | 'changePassword' | 'language' | null;

export function Sidebar({
  open,
  onClose,
  wallet,
}: {
  open: boolean;
  onClose: () => void;
  wallet: WalletBalance;
}) {
  const { isAuthenticated, user, logout } = useAuth();
  const { open: openAuth } = useAuthModal();
  const { theme, setTheme } = useTheme();
  const [activeModal, setActiveModal] = useState<ModalKey>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Only render the body portal after mount so the first client render matches
  // the server (which renders nothing) — avoids a portal hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Reset transient UI whenever the drawer fully closes.
  useEffect(() => {
    if (!open) {
      setActiveModal(null);
      setExpanded(null);
    }
  }, [open]);

  if (!mounted) return null;

  const isDark = theme !== 'light';

  const copyId = async () => {
    if (!user) return;
    try {
      await navigator.clipboard.writeText(user.username);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  const themeToggle = (
    <div className="flex items-center gap-3 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-[var(--text-secondary)]">
        {isDark ? <Moon size={17} /> : <Sun size={17} />}
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium">Theme</p>
        <p className="text-xs text-[var(--text-secondary)]">{isDark ? 'Dark' : 'Light'}</p>
      </div>
      <div className="flex items-center gap-1 rounded-pill border border-[var(--card-border)] bg-white/5 p-1">
        <button
          onClick={() => setTheme('light')}
          aria-label="Light theme"
          className={cn(
            'rounded-full p-1.5 transition-colors',
            !isDark ? 'bg-brand-solid text-white' : 'text-[var(--text-secondary)]'
          )}
        >
          <Sun size={14} />
        </button>
        <button
          onClick={() => setTheme('dark')}
          aria-label="Dark theme"
          className={cn(
            'rounded-full p-1.5 transition-colors',
            isDark ? 'bg-brand-solid text-white' : 'text-[var(--text-secondary)]'
          )}
        >
          <Moon size={14} />
        </button>
      </div>
    </div>
  );

  return createPortal(
    <>
      <div
        className={cn(
          'fixed inset-0 z-[45] bg-black/60 transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed left-0 top-0 z-[46] flex h-full w-[86%] max-w-[380px] flex-col overflow-y-auto border-r border-[var(--card-border)] transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: 'var(--drawer-bg)' }}
        aria-hidden={!open}
      >
        {/* Top bar */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[var(--card-border)] px-4 py-3 backdrop-blur-glass"
          style={{ background: 'var(--header-bar-scrim)' }}
        >
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-full p-1.5 text-[var(--text-primary)] hover:bg-white/10"
          >
            <X size={20} />
          </button>
          <Link href="/game" onClick={onClose} className="flex items-center gap-2">
            <Image
              src="https://digitlink.mobi/img/icons/icon-192x192.png"
              alt={APP_NAME}
              width={26}
              height={26}
              unoptimized
              className="rounded-md"
            />
            <span className="text-sm font-black uppercase tracking-wide">{APP_NAME}</span>
          </Link>
          <button
            onClick={() => setActiveModal('language')}
            className="flex items-center gap-1.5 rounded-pill px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-white/10"
          >
            <Globe size={14} /> English
          </button>
        </div>

        {isAuthenticated && user ? (
          <div className="flex flex-col gap-4 p-4">
            {/* Profile row */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveModal('avatar')}
                className="relative shrink-0"
                aria-label="Edit profile"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-solid text-2xl">
                  {user.avatarEmoji}
                </span>
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--drawer-bg)] bg-brand-solid text-white">
                  <Pencil size={10} />
                </span>
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="text-sm font-semibold text-[var(--text-secondary)]">ID:</span>
                <span className="truncate text-sm font-bold">{user.username}</span>
                <button
                  onClick={copyId}
                  aria-label="Copy ID"
                  className="shrink-0 text-[var(--text-secondary)] hover:text-brand"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              {user.kycStatus === 'verified' ? (
                <Badge tone="success">Verified</Badge>
              ) : (
                <Badge tone="danger">Not Verified</Badge>
              )}
            </div>

            {/* Balance card */}
            <div className="rounded-xl border border-brand/30 bg-brand/[0.06] p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border-r border-[var(--divider-color)] pr-4">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-black">
                      GC
                    </span>
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">
                      Gold Coins
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-lg font-black text-amber-400">
                    {Number(wallet.goldCoin).toLocaleString()}
                  </p>
                  <span className="mt-1.5 inline-block rounded-pill bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
                    Play Only
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-solid text-[9px] font-black text-white">
                      SC
                    </span>
                    <span className="text-xs font-semibold leading-tight text-[var(--text-secondary)]">
                      Sweepstakes Coins
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-lg font-black text-brand">
                    {Number(wallet.totalBalance).toFixed(2)}
                  </p>
                  <div className="mt-1.5 flex gap-3">
                    <MiniStat label="Unplayed" value={wallet.unwagered} />
                    <MiniStat label="Redeemable" value={wallet.withdrawable} accent />
                  </div>
                </div>
              </div>
            </div>

            {/* Deposit / Withdraw */}
            <div className="grid grid-cols-2 gap-4">
              <ActionButton
                icon={Plus}
                label="Deposit"
                tone="danger"
                onClick={() => setActiveModal('deposit')}
              />
              <ActionButton
                icon={Upload}
                label="Withdraw"
                tone="brand"
                onClick={() => setActiveModal('withdraw')}
              />
            </div>

            <div className="h-px bg-[var(--divider-color)]" />

            {/* Menu */}
            <nav className="flex flex-col">
              <MenuRow
                icon={Smartphone}
                label="Bind/Change Phone"
                sub={user.phoneBound ? 'Bound' : 'Not Bound'}
                onClick={() => setActiveModal('bindPhone')}
              />
              <MenuRow
                icon={Lock}
                label="Change Password"
                sub="Security settings"
                onClick={() => setActiveModal('changePassword')}
              />
              <MenuRow
                icon={Gift}
                label="Invite & Earn"
                sub="Share your link, earn rewards when friends deposit"
                href="/share-activity"
                onClose={onClose}
              />
              <ExpandRow
                icon={FileText}
                label="Transactions"
                sub="Order History"
                open={expanded === 'tx'}
                onToggle={() => setExpanded((e) => (e === 'tx' ? null : 'tx'))}
                items={[
                  { label: 'Deposit', href: '/orders?type=deposit' },
                  { label: 'Withdraw', href: '/orders?type=withdraw' },
                  { label: 'Redemption Review', href: '/redemption-reviews' },
                ]}
                onClose={onClose}
              />
              <ExpandRow
                icon={HelpCircle}
                label="Help Center"
                sub="Help Center"
                open={expanded === 'help'}
                onToggle={() => setExpanded((e) => (e === 'help' ? null : 'help'))}
                items={[
                  { label: 'General', href: '/help-guide' },
                  { label: 'Deposit', href: '/help-guide?tab=deposit' },
                  { label: 'Withdraw', href: '/help-guide?tab=withdraw' },
                ]}
                onClose={onClose}
              />
              {themeToggle}
            </nav>

            <div className="h-px bg-[var(--divider-color)]" />

            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="flex items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold text-danger hover:bg-danger/10"
            >
              <LogOut size={16} /> Logout
            </button>

            <p className="pb-4 text-center text-[11px] text-[var(--text-secondary)]">
              v1.1.2 · Desktop Device
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-5">
            <div>
              <p className="text-xl font-bold">Welcome!</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Sign in to view your balance, play games and claim rewards.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  onClose();
                  openAuth('login');
                }}
              >
                Login
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  onClose();
                  openAuth('register');
                }}
              >
                Register
              </Button>
            </div>

            <div className="h-px bg-[var(--divider-color)]" />

            <nav className="flex flex-col">
              <MenuRow
                icon={Gift}
                label="Invite & Earn"
                sub="Share your link and earn rewards"
                href="/share-activity"
                onClose={onClose}
              />
              <MenuRow
                icon={HelpCircle}
                label="Help Center"
                sub="Get help and support"
                href="/help-guide"
                onClose={onClose}
              />
              <MenuRow
                icon={FileText}
                label="Terms & Privacy"
                sub="Legal information"
                href="/terms"
                onClose={onClose}
              />
              {themeToggle}
            </nav>
          </div>
        )}
      </aside>

      {/* Reused feature modals — layered above the drawer via their own z-50 */}
      <ShopModal open={activeModal === 'deposit'} onClose={() => setActiveModal(null)} />
      <WithdrawModal
        open={activeModal === 'withdraw'}
        onClose={() => setActiveModal(null)}
        wallet={wallet}
      />
      <AvatarEditorModal open={activeModal === 'avatar'} onClose={() => setActiveModal(null)} />
      <BindPhoneModal open={activeModal === 'bindPhone'} onClose={() => setActiveModal(null)} />
      <ChangePasswordModal
        open={activeModal === 'changePassword'}
        onClose={() => setActiveModal(null)}
      />
      <LanguageModal open={activeModal === 'language'} onClose={() => setActiveModal(null)} />
    </>,
    document.body
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-[var(--text-secondary)]">{label}</p>
      <p className="flex items-center gap-1 text-[11px] font-bold">
        <span
          className={cn(
            'inline-block h-1.5 w-1.5 rounded-full',
            accent ? 'bg-brand' : 'bg-white/40'
          )}
        />
        <span className={accent ? 'text-brand' : undefined}>{value}</span>
      </p>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  tone,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  tone: 'danger' | 'brand';
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5">
      <span
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full border border-[var(--card-border)] bg-white/5',
          tone === 'danger' ? 'text-danger' : 'text-brand'
        )}
      >
        <Icon size={tone === 'danger' ? 22 : 20} />
      </span>
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}

interface MenuRowProps {
  icon: LucideIcon;
  label: string;
  sub?: string;
  href?: string;
  onClick?: () => void;
  onClose?: () => void;
}

function MenuRow({ icon: Icon, label, sub, href, onClick, onClose }: MenuRowProps) {
  const inner = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[var(--text-secondary)]">
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="truncate text-xs text-[var(--text-secondary)]">{sub}</p>}
      </div>
      <ChevronRight size={16} className="shrink-0 text-[var(--text-secondary)]" />
    </>
  );

  return href ? (
    <Link href={href} onClick={onClose} className="flex items-center gap-3 py-3 hover:opacity-80">
      {inner}
    </Link>
  ) : (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 py-3 text-left hover:opacity-80"
    >
      {inner}
    </button>
  );
}

function ExpandRow({
  icon: Icon,
  label,
  sub,
  open,
  onToggle,
  items,
  onClose,
}: {
  icon: LucideIcon;
  label: string;
  sub?: string;
  open: boolean;
  onToggle: () => void;
  items: { label: string; href: string }[];
  onClose?: () => void;
}) {
  return (
    <div>
      <button onClick={onToggle} className="flex w-full items-center gap-3 py-3 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[var(--text-secondary)]">
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{label}</p>
          {sub && <p className="truncate text-xs text-[var(--text-secondary)]">{sub}</p>}
        </div>
        <ChevronDown
          size={16}
          className={cn(
            'shrink-0 text-[var(--text-secondary)] transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <div className="ml-12 flex flex-col gap-1 pb-2">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={onClose}
              className="rounded-md px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
            >
              {it.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
