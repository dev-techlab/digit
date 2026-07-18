'use client';

import { useState } from 'react';
import { Phone, Lock, CheckCircle2 } from 'lucide-react';
import { AuthModalFrame } from './AuthModalFrame';
import { Button } from '@/components/ui/Button';
import { IconInput } from '@/components/ui/IconInput';
import { useAuthModal } from '@/lib/auth-modal-context';

const RESEND_COOLDOWN_S = 60;

export function ResetPasswordModal() {
  const { mode, close, open } = useAuthModal();
  const [step, setStep] = useState<'phone' | 'reset' | 'done'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep('phone');
    setPhone('');
    setCode('');
    setNewPassword('');
    setError(null);
  };

  const sendCode = async () => {
    if (!phone.trim()) {
      setError('Enter your phone number.');
      return;
    }
    setSendingCode(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: phone.trim(), purpose: 'reset_password' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Failed to send code');
      setStep('reset');
      setCooldown(RESEND_COOLDOWN_S);
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

  const submitReset = async () => {
    if (!code.trim() || newPassword.length < 6) {
      setError('Enter the code and a password of at least 6 characters.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: phone.trim(), code: code.trim(), newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Failed to reset password');
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthModalFrame open={mode === 'reset'} onClose={close} tagline="Recover your account">
      <h2 className="text-2xl font-black">Retrieve Account</h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Verify your phone number to set a new password
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      {step === 'done' ? (
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <CheckCircle2 size={36} className="text-success" />
          <p className="text-sm text-success">
            Password reset. You can now log in with your new password.
          </p>
          <Button
            fullWidth
            variant="secondary"
            onClick={() => {
              reset();
              open('login');
            }}
          >
            Back to Login
          </Button>
        </div>
      ) : step === 'phone' ? (
        <div className="mt-6 space-y-4">
          <IconInput
            icon={<Phone size={16} />}
            label="Phone Number"
            placeholder="Enter your phone number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="text-xs text-[var(--text-secondary)]">
            We&apos;ll text a verification code to this number so you can set a new password.
          </p>
          <Button fullWidth disabled={sendingCode} onClick={sendCode}>
            {sendingCode ? 'Sending…' : 'Send Code'}
          </Button>
          <button
            onClick={() => open('login')}
            className="block w-full text-center text-sm text-[var(--text-secondary)] hover:text-brand"
          >
            Back to Login
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <IconInput
            icon={<Lock size={16} />}
            label="Verification Code"
            placeholder="Enter the code we texted you"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <IconInput
            icon={<Lock size={16} />}
            label="New Password"
            type="password"
            placeholder="Min. 6 characters"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Button
            variant="secondary"
            className="w-full"
            disabled={sendingCode || cooldown > 0}
            onClick={sendCode}
          >
            {cooldown > 0 ? `Resend code (${cooldown}s)` : sendingCode ? 'Sending…' : 'Resend code'}
          </Button>
          <Button fullWidth disabled={submitting} onClick={submitReset}>
            {submitting ? 'Resetting…' : 'Reset Password'}
          </Button>
          <button
            onClick={() => open('login')}
            className="block w-full text-center text-sm text-[var(--text-secondary)] hover:text-brand"
          >
            Back to Login
          </button>
        </div>
      )}
    </AuthModalFrame>
  );
}
