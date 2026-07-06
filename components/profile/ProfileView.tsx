'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Phone,
  Lock,
  Globe,
  ShieldCheck,
  HelpCircle,
  History,
  Download,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/lib/auth-modal-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KycBanner } from './KycBanner';
import { BindPhoneModal } from './BindPhoneModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { LanguageModal } from './LanguageModal';
import { SecuritySettingsModal } from './SecuritySettingsModal';
import { InstallPwaModal } from './InstallPwaModal';
import { AvatarEditorModal } from './AvatarEditorModal';
import type { WalletBalance } from '@/lib/types';

type ModalKey =
  'bindPhone' | 'changePassword' | 'language' | 'security' | 'installPwa' | 'avatar' | null;

export function ProfileView({ wallet }: { wallet: WalletBalance }) {
  const { isAuthenticated, user, logout } = useAuth();
  const { open } = useAuthModal();
  const [activeModal, setActiveModal] = useState<ModalKey>(null);
  const close = () => setActiveModal(null);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center px-6 pt-16 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/5 text-3xl">
          👤
        </div>
        <h1 className="text-lg font-bold">Welcome to Digit Link</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Sign in to view your balance, orders and rewards
        </p>
        <div className="mt-6 flex w-full max-w-xs gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => open('login')}>
            Login
          </Button>
          <Button className="flex-1" onClick={() => open('register')}>
            Register
          </Button>
        </div>
      </div>
    );
  }

  const MENU: {
    icon: typeof Phone;
    label: string;
    href?: string;
    onClick?: () => void;
    trailing?: React.ReactNode;
  }[] = [
    {
      icon: Phone,
      label: 'Bind Phone',
      onClick: () => setActiveModal('bindPhone'),
      trailing: !user.phoneBound && <Badge tone="warning">Not Bound</Badge>,
    },
    { icon: Lock, label: 'Change Password', onClick: () => setActiveModal('changePassword') },
    { icon: Globe, label: 'Display Language', onClick: () => setActiveModal('language') },
    { icon: ShieldCheck, label: 'Security Settings', onClick: () => setActiveModal('security') },
    { icon: HelpCircle, label: 'Help Center', href: '/help-guide' },
    { icon: History, label: 'Order History', href: '/orders' },
    { icon: Download, label: 'Install PWA', onClick: () => setActiveModal('installPwa') },
  ];

  return (
    <div className="space-y-4 px-4 pt-4">
      <button
        onClick={() => setActiveModal('avatar')}
        className="flex items-center gap-4 text-left"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-solid text-3xl">
          {user.avatarEmoji}
        </div>
        <div>
          <p className="text-lg font-bold">{user.nickname}</p>
          <p className="text-sm text-[var(--text-secondary)]">@{user.username}</p>
        </div>
      </button>

      <Card className="grid grid-cols-3 divide-x divide-[var(--divider-color)] p-4 text-center">
        <div>
          <p className="text-xs text-[var(--text-secondary)]">Total</p>
          <p className="mt-1 font-bold">{wallet.totalBalance}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-secondary)]">Unplayed</p>
          <p className="mt-1 font-bold">{wallet.unwagered}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-secondary)]">Redeemable</p>
          <p className="mt-1 font-bold text-brand">{wallet.withdrawable}</p>
        </div>
      </Card>

      {user.kycStatus !== 'verified' && <KycBanner status={user.kycStatus} />}

      <Card className="divide-y divide-[var(--divider-color)] overflow-hidden">
        {MENU.map(({ icon: Icon, label, href, onClick, trailing }) => {
          const content = (
            <>
              <Icon size={17} className="text-[var(--text-secondary)]" />
              <span className="flex-1 text-sm">{label}</span>
              {trailing}
              <ChevronRight size={16} className="text-[var(--text-secondary)]" />
            </>
          );
          return href ? (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5"
            >
              {content}
            </Link>
          ) : (
            <button
              key={label}
              onClick={onClick}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-white/5"
            >
              {content}
            </button>
          );
        })}
      </Card>

      <button
        onClick={logout}
        className="flex w-full items-center justify-center gap-2 rounded-md py-3 text-sm font-semibold text-danger hover:bg-danger/10"
      >
        <LogOut size={16} />
        Logout
      </button>

      <p className="pb-2 text-center text-[11px] text-[var(--text-secondary)]">
        <Badge tone="neutral">Web</Badge>
      </p>

      <BindPhoneModal open={activeModal === 'bindPhone'} onClose={close} />
      <ChangePasswordModal open={activeModal === 'changePassword'} onClose={close} />
      <LanguageModal open={activeModal === 'language'} onClose={close} />
      <SecuritySettingsModal
        open={activeModal === 'security'}
        onClose={close}
        onChangePassword={() => setActiveModal('changePassword')}
        onBindPhone={() => setActiveModal('bindPhone')}
      />
      <InstallPwaModal open={activeModal === 'installPwa'} onClose={close} />
      <AvatarEditorModal open={activeModal === 'avatar'} onClose={close} />
    </div>
  );
}
