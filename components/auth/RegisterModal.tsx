'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, User, Lock, Gift, ArrowRight, CheckCircle2, Copy } from 'lucide-react';
import { AuthModalFrame } from './AuthModalFrame';
import { Button } from '@/components/ui/Button';
import { IconInput } from '@/components/ui/IconInput';
import { Tabs } from '@/components/ui/Tabs';
import { useAuth, type MockUser } from '@/lib/auth-context';
import { useAuthModal } from '@/lib/auth-modal-context';

export function RegisterModal() {
  const { mode, close, open } = useAuthModal();
  const { setUser } = useAuth();
  const [method, setMethod] = useState('quick');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickCredentials, setQuickCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const reset = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setInviteCode('');
    setError(null);
    setQuickCredentials(null);
  };

  const register = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? 'Registration failed');
    return data as { user: MockUser; credentials?: { username: string; password: string } };
  };

  const quickRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await register({});
      setUser(data.user);
      if (data.credentials) {
        // This is the only time the generated password is shown — hold the
        // modal open so the player can copy it before continuing.
        setQuickCredentials(data.credentials);
      } else {
        close();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const manualRegister = async () => {
    if (username.trim().length < 8) {
      setError('Username must be at least 8 characters.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await register({
        username: username.trim(),
        password,
        inviteCode: inviteCode.trim() || undefined,
      });
      setUser(data.user);
      reset();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (quickCredentials) {
    return (
      <AuthModalFrame
        open={mode === 'register'}
        onClose={close}
        tagline="Join us and start winning!"
      >
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 size={40} className="text-success" />
          <h2 className="text-xl font-black">Account Created</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Save these credentials now — this is the only time your password is shown.
          </p>
          <div className="mt-2 w-full space-y-2 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] p-4 text-left text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--text-secondary)]">Username</span>
              <span className="font-mono font-semibold">{quickCredentials.username}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--text-secondary)]">Password</span>
              <span className="font-mono font-semibold">{quickCredentials.password}</span>
            </div>
          </div>
          <Button
            variant="secondary"
            className="mt-1"
            onClick={() => {
              navigator.clipboard
                ?.writeText(`${quickCredentials.username} / ${quickCredentials.password}`)
                .catch(() => {});
            }}
          >
            <Copy size={14} /> Copy credentials
          </Button>
          <Button
            fullWidth
            className="mt-3"
            onClick={() => {
              reset();
              close();
            }}
          >
            Continue
          </Button>
        </div>
      </AuthModalFrame>
    );
  }

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
        onChange={(v) => {
          setMethod(v);
          setError(null);
        }}
      />

      {error && (
        <p className="mt-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      {method === 'quick' ? (
        <div className="mt-5 space-y-4">
          <div className="flex items-start gap-3 rounded-md bg-brand/10 p-3 text-sm">
            <Sparkles size={18} className="mt-0.5 shrink-0 text-brand" />
            <p className="text-[var(--text-secondary)]">
              One-click to generate account credentials. Auto-generate account and register
              instantly.
            </p>
          </div>
          <Button fullWidth onClick={quickRegister} disabled={loading}>
            {loading ? 'Creating…' : 'Quick Register'}
            {!loading && <ArrowRight size={16} />}
          </Button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <IconInput
            icon={<User size={16} />}
            label="Username"
            placeholder="Min. 8 characters"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <IconInput
            icon={<Lock size={16} />}
            label="Password"
            type="password"
            placeholder="Min. 6 characters"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <IconInput
            icon={<Lock size={16} />}
            label="Confirm Password"
            type="password"
            placeholder="Re-enter password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <IconInput
            icon={<Gift size={16} />}
            label="Invite Code (Optional)"
            placeholder="Enter invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
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
          <Button fullWidth onClick={manualRegister} disabled={loading}>
            {loading ? 'Creating…' : 'Create Account'}
            {!loading && <ArrowRight size={16} />}
          </Button>
        </div>
      )}

      <p className="mt-5 text-center text-sm text-[var(--text-secondary)]">
        Already have an account?{' '}
        <button
          onClick={() => {
            reset();
            open('login');
          }}
          className="font-semibold text-brand"
        >
          Login
        </button>
      </p>
    </AuthModalFrame>
  );
}
