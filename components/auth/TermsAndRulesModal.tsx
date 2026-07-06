'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';

const STORAGE_KEY = 'digitlink:terms-accepted';

const GENERAL_RULES = [
  'You must be at least 21 years old and not a political figure to participate in the game.',
  'Only one account is allowed per person; creating multiple accounts may invalidate all credits and wins.',
  'Please use the services provided by this platform in accordance with the terms and conditions of federal and state laws; otherwise, all credits and wins will be invalidated.',
  'The maximum daily deposit and withdrawal limits may vary by each agent store operator. Please contact your store operator for details.',
  'All paid and free credits must be played through before becoming eligible for redemption.',
  'Operating Hours: Loading and gameplay are available 24/7.',
  'Please choose service providers (store operators) you are familiar with and trust. The platform is not liable for any disputes that arise between you and a store operator.',
  'Golden Coins (GC) are for entertainment only and cannot be redeemed for cash or prizes.',
  'The platform reserves the right to review, adjust, or void any transaction suspected of fraud, abuse, or violation of these rules.',
];

export function TermsAndRulesModal() {
  const { isAuthenticated } = useAuth();
  // Assume accepted until the client tells us otherwise, so guests never flash the gate.
  const [accepted, setAccepted] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAccepted(localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  const open = mounted && isAuthenticated && !accepted;

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const agree = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setAccepted(true);
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Mandatory gate: backdrop is intentionally not clickable and there is no close button. */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-rules-title"
        className="relative z-10 flex max-h-[85dvh] w-full max-w-[440px] animate-modalScaleIn flex-col rounded-xl border border-[var(--card-border)] bg-[var(--modal-bg)] p-6 shadow-2xl"
      >
        <h2 id="terms-rules-title" className="text-center text-xl font-bold text-brand">
          Terms and Rules
        </h2>

        <div className="scrollbar-thin mt-5 flex-1 overflow-y-auto pr-2">
          <h3 className="font-semibold text-brand">General Rules</h3>
          <ul className="mt-3 space-y-3">
            {GENERAL_RULES.map((rule) => (
              <li
                key={rule}
                className="flex gap-2.5 text-sm leading-relaxed text-[var(--text-secondary)]"
              >
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex flex-col items-center gap-3 border-t border-[var(--divider-color)] pt-5">
          <Button onClick={agree} className="px-12">
            I Agree
          </Button>
          <p className="text-center text-xs text-[var(--text-secondary)]">
            You must accept these rules to continue using the platform
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
