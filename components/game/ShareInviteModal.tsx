'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Facebook, Twitter, MessageCircle, Link2, Check } from 'lucide-react';
import { cn } from '@/lib/cn';

const SHARE_MESSAGE = 'Join me on Digit Link and we both get rewarded!';

export function ShareInviteModal({
  open,
  onClose,
  link,
}: {
  open: boolean;
  onClose: () => void;
  link: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // Reset the copied state when the modal is reopened.
  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const encodedLink = encodeURIComponent(link);
  const encodedMsg = encodeURIComponent(SHARE_MESSAGE);

  const openShare = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=600');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  const channels = [
    {
      label: 'Telegram',
      Icon: Send,
      bg: 'bg-[#229ED9]',
      onClick: () => openShare(`https://t.me/share/url?url=${encodedLink}&text=${encodedMsg}`),
    },
    {
      label: 'Facebook',
      Icon: Facebook,
      bg: 'bg-[#1877F2]',
      onClick: () => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`),
    },
    {
      label: 'Twitter',
      Icon: Twitter,
      bg: 'bg-[#1DA1F2]',
      onClick: () =>
        openShare(`https://twitter.com/intent/tweet?url=${encodedLink}&text=${encodedMsg}`),
    },
    {
      label: 'WhatsApp',
      Icon: MessageCircle,
      bg: 'bg-[#25D366]',
      onClick: () => openShare(`https://wa.me/?text=${encodedMsg}%20${encodedLink}`),
    },
    {
      label: copied ? 'Copied!' : 'Copy Link',
      Icon: copied ? Check : Link2,
      bg: 'bg-[#7c3aed]',
      onClick: copyLink,
    },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md animate-modalScaleIn rounded-2xl border border-[var(--card-border)] bg-[var(--drawer-bg)] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex-1 text-center text-xl font-bold">Share Invite Link</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[var(--text-secondary)] hover:bg-white/20"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-start justify-center gap-2 sm:gap-3">
          {channels.map(({ label, Icon, bg, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="flex w-14 shrink-0 flex-col items-center gap-2"
            >
              <span
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full text-white transition-transform hover:scale-105',
                  bg
                )}
              >
                <Icon size={23} />
              </span>
              <span className="text-[11px] text-[var(--text-secondary)]">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
