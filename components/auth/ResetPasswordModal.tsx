'use client';

import { useState } from 'react';
import { Phone, CheckCircle2 } from 'lucide-react';
import { AuthModalFrame } from './AuthModalFrame';
import { Button } from '@/components/ui/Button';
import { IconInput } from '@/components/ui/IconInput';
import { useAuthModal } from '@/lib/auth-modal-context';

export function ResetPasswordModal() {
  const { mode, close, open } = useAuthModal();
  const [sent, setSent] = useState(false);

  return (
    <AuthModalFrame open={mode === 'reset'} onClose={close} tagline="Recover your account">
      <h2 className="text-2xl font-black">Retrieve Account</h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Enter your phone number to retrieve account
      </p>

      {sent ? (
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <CheckCircle2 size={36} className="text-success" />
          <p className="text-sm text-success">
            Account information sent successfully. Please check your phone
          </p>
          <Button fullWidth variant="secondary" onClick={() => open('login')}>
            Back to Login
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <IconInput
            icon={<Phone size={16} />}
            label="Phone Number"
            placeholder="Enter your phone number"
            inputMode="tel"
          />
          <p className="text-xs text-[var(--text-secondary)]">
            Your account username and password will be sent to this phone number via SMS.
          </p>
          <Button fullWidth onClick={() => setSent(true)}>
            Retrieve
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
