'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/lib/auth-modal-context';
import { Button } from '@/components/ui/Button';

/** Gates a page behind login — shows a sign-in prompt instead of a silently empty view. */
export function RequireAuth({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  const { isAuthenticated } = useAuth();
  const { open } = useAuthModal();

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center px-6 pt-16 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/5 text-3xl">
          👤
        </div>
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{body}</p>
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

  return <>{children}</>;
}
