'use client';

import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X, ShieldCheck, Zap, Gift } from 'lucide-react';
import { cn } from '@/lib/cn';
import { APP_NAME } from '@/lib/constants';

const FEATURES = [
  { icon: ShieldCheck, label: 'Secure & Safe' },
  { icon: Zap, label: 'Lightning Fast' },
  { icon: Gift, label: 'Exclusive Rewards' },
];

interface AuthModalFrameProps {
  open: boolean;
  onClose: () => void;
  tagline: string;
  children: ReactNode;
}

export function AuthModalFrame({ open, onClose, tagline, children }: AuthModalFrameProps) {
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

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-[950px] animate-modalScaleIn overflow-hidden rounded-t-2xl bg-[var(--modal-bg)] shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">
        <div className="relative hidden w-[380px] shrink-0 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-brand-solid to-blue-900 p-10 text-center md:flex">
          <div className="pointer-events-none absolute -left-10 top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -right-14 bottom-16 h-52 w-52 rounded-full bg-white/10 blur-2xl" />

          <div className="relative h-20 w-20 overflow-hidden rounded-2xl shadow-lg">
            <Image
              src="https://digitlink.mobi/img/icons/icon-192x192.png"
              alt={APP_NAME}
              fill
              sizes="80px"
              unoptimized
            />
          </div>
          <p className="relative mt-5 text-2xl font-black text-white">{APP_NAME}</p>
          <p className="relative mt-2 text-sm text-white/85">{tagline}</p>

          <div className="relative mt-8 w-full space-y-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white"
              >
                <Icon size={18} />
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex-1 overflow-y-auto p-6 sm:p-8">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-[var(--text-secondary)] hover:bg-white/20"
          >
            <X size={18} />
          </button>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
