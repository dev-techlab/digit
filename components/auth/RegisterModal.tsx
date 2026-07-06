'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, User, Lock, Gift, ArrowRight } from 'lucide-react';
import { AuthModalFrame } from './AuthModalFrame';
import { Button } from '@/components/ui/Button';
import { IconInput } from '@/components/ui/IconInput';
import { Tabs } from '@/components/ui/Tabs';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/lib/auth-modal-context';

export function RegisterModal() {
  const { mode, close, open } = useAuthModal();
  const { login } = useAuth();
  const [method, setMethod] = useState('quick');

  const submit = () => {
    login();
    close();
  };

  return (
    <AuthModalFrame open={mode === 'register'} onClose={close} tagline="Join us and start winning!">
      <h2 className="text-2xl font-black">Create Account</h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">Join us and start winning!</p>

      <Tabs
        className="mt-6"
        options={[
          { value: 'quick', label: 'Quick Register' },
          { value: 'manual', label: 'Manual Register' },
        ]}
        value={method}
        onChange={setMethod}
      />

      {method === 'quick' ? (
        <div className="mt-5 space-y-4">
          <div className="flex items-start gap-3 rounded-md bg-brand/10 p-3 text-sm">
            <Sparkles size={18} className="mt-0.5 shrink-0 text-brand" />
            <p className="text-[var(--text-secondary)]">
              One-click to generate account credentials. Auto-generate account and register
              instantly.
            </p>
          </div>
          <Button fullWidth onClick={submit}>
            Quick Register
            <ArrowRight size={16} />
          </Button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <IconInput icon={<User size={16} />} label="Username" placeholder="Min. 8 characters" />
          <IconInput
            icon={<Lock size={16} />}
            label="Password"
            type="password"
            placeholder="Min. 6 characters"
          />
          <IconInput
            icon={<Lock size={16} />}
            label="Confirm Password"
            type="password"
            placeholder="Re-enter password"
          />
          <IconInput
            icon={<Gift size={16} />}
            label="Invite Code (Optional)"
            placeholder="Enter invite code"
          />
          <p className="text-xs text-[var(--text-secondary)]">
            By continuing, you agree to our{' '}
            <Link href="/terms" onClick={close} className="text-brand hover:underline">
              Terms
            </Link>{' '}
            &{' '}
            <Link href="/privacy" onClick={close} className="text-brand hover:underline">
              Privacy
            </Link>
          </p>
          <Button fullWidth onClick={submit}>
            Create Account
            <ArrowRight size={16} />
          </Button>
        </div>
      )}

      <p className="mt-5 text-center text-sm text-[var(--text-secondary)]">
        Already have an account?{' '}
        <button onClick={() => open('login')} className="font-semibold text-brand">
          Login
        </button>
      </p>
    </AuthModalFrame>
  );
}
