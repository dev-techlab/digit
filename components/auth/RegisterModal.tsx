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
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'phone' | null>(null);
  const [verificationDestination, setVerificationDestination] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const reset = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setEmail('');
    setPhone('');
    setInviteCode('');
    setError(null);
    setPendingVerification(false);
    setVerificationMethod(null);
    setVerificationDestination('');
    setOtpCode('');
    setCooldown(0);
    setSendingCode(false);
  };

  const sendCode = async () => {
    setSendingCode(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: verificationDestination, purpose: 'register' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Failed to send code');
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send code');
    } finally {
      setSendingCode(false);
    }
  };

  const register = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? 'Registration failed');
    return data as { 
      user: MockUser; 
      credentials?: { username: string; password: string };
      pendingVerification?: boolean;
      verificationMethod?: 'email' | 'phone';
    };
  };

  const verifyOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: verificationDestination,
          purpose: 'register',
          code: otpCode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Verification failed');
      setUser(data.user);
      reset();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };


  const manualRegister = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!inviteCode.trim()) {
      setError('Invite Code is required.');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const data = await register({
        username: username.trim() || undefined,
        password,
        email: method === 'email' ? email.trim() : undefined,
        phone: method === 'phone' ? phone.trim() : undefined,
        inviteCode: inviteCode.trim(),
      });
      
      if (data.pendingVerification) {
        setPendingVerification(true);
        setVerificationMethod(data.verificationMethod ?? null);
        setVerificationDestination(method === 'email' ? email.trim() : phone.trim());
      } else {
        setUser(data.user);
        reset();
        close();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };


  if (pendingVerification) {
    return (
      <AuthModalFrame open={mode === 'register'} onClose={close} tagline="Verify your account">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <h2 className="text-2xl font-black">Verification Required</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            We sent a verification code to <strong>{verificationDestination}</strong>.
            Please enter it below to complete your registration.
          </p>

          {error && (
            <p className="mt-4 w-full rounded-md bg-danger/10 px-3 py-2 text-sm text-danger text-left">
              {error}
            </p>
          )}

          <div className="mt-4 w-full space-y-4 text-left">
            <div>
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                Verification Code
              </span>
              <div className="flex gap-2">
                <IconInput
                  icon={<Lock size={16} />}
                  placeholder="Enter 6-digit code"
                  containerClassName="flex-1"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                />
                <Button
                  variant="secondary"
                  className="whitespace-nowrap px-4"
                  disabled={sendingCode || cooldown > 0}
                  onClick={sendCode}
                >
                  {cooldown > 0 ? `Resend (${cooldown}s)` : sendingCode ? 'Sending…' : 'Resend code'}
                </Button>
              </div>
            </div>
            <Button fullWidth onClick={verifyOtp} disabled={loading || !otpCode}>
              {loading ? 'Verifying…' : 'Verify Account'}
            </Button>
            <Button variant="secondary" fullWidth onClick={() => setPendingVerification(false)}>
              Back
            </Button>
          </div>
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
          { value: 'email', label: 'Email' },
          { value: 'phone', label: 'Phone' },
        ]}
        value={method}
        onChange={(v) => {
          setMethod(v as any);
          setError(null);
        }}
      />

      {error && (
        <p className="mt-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="mt-5 space-y-4">
          {method === 'email' ? (
            <IconInput
              icon={<User size={16} />}
              label="Email Address"
              placeholder="Enter your email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          ) : (
            <IconInput
              icon={<User size={16} />}
              label="Phone Number"
              placeholder="Enter your phone"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          )}
          
          <IconInput
            icon={<User size={16} />}
            label="Username (Optional)"
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
            label="Invite Code (Required)"
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
