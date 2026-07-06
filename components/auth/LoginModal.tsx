'use client';

import { useState } from 'react';
import Link from 'next/link';
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { AuthModalFrame } from './AuthModalFrame';
import { Button } from '@/components/ui/Button';
import { IconInput } from '@/components/ui/IconInput';
import { Tabs } from '@/components/ui/Tabs';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/lib/auth-modal-context';

export function LoginModal() {
  const { mode, close, open } = useAuthModal();
  const { login } = useAuth();
  const [method, setMethod] = useState('account');
  const [showPassword, setShowPassword] = useState(false);

  const submit = () => {
    login();
    close();
  };

  return (
    <AuthModalFrame open={mode === 'login'} onClose={close} tagline="Welcome back! Ready to play?">
      <h2 className="text-2xl font-black">Member Login</h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">Connect all your games</p>

      <Tabs
        className="mt-6"
        options={[
          { value: 'account', label: 'Account' },
          { value: 'phone', label: 'Phone' },
        ]}
        value={method}
        onChange={setMethod}
      />

      <div className="mt-5 space-y-4">
        {method === 'account' ? (
          <>
            <IconInput
              icon={<User size={16} />}
              label="Username"
              placeholder="Please enter username"
            />
            <IconInput
              icon={<Lock size={16} />}
              label="Password"
              labelAction={
                <button
                  onClick={() => open('reset')}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Forgot Password?
                </button>
              }
              type={showPassword ? 'text' : 'password'}
              placeholder="Please enter password"
              trailing={
                <button
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
          </>
        ) : (
          <>
            <IconInput
              icon={<User size={16} />}
              label="Phone Number"
              placeholder="Phone Number"
              inputMode="tel"
            />
            <div>
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                Verification Code
              </span>
              <div className="flex gap-2">
                <IconInput
                  icon={<Lock size={16} />}
                  placeholder="Verification code"
                  className="flex-1"
                />
                <Button variant="secondary" className="whitespace-nowrap px-4">
                  Send code
                </Button>
              </div>
            </div>
          </>
        )}

        <Button fullWidth onClick={submit} className="mt-2">
          Login
          <ArrowRight size={16} />
        </Button>

        <div className="h-px bg-[var(--divider-color)]" />

        <p className="text-center text-xs text-[var(--text-secondary)]">
          By continuing, you agree to our{' '}
          <Link href="/terms" onClick={close} className="text-brand hover:underline">
            Terms
          </Link>{' '}
          &{' '}
          <Link href="/privacy" onClick={close} className="text-brand hover:underline">
            Privacy
          </Link>
        </p>

        <p className="text-center text-sm text-[var(--text-secondary)]">
          Don&apos;t have an account?{' '}
          <button onClick={() => open('register')} className="font-semibold text-brand">
            Register
          </button>
        </p>
      </div>
    </AuthModalFrame>
  );
}
