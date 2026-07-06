'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth-context';

export function BindPhoneModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { updateProfile } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setPhone('');
      setCode('');
      setCodeSent(false);
      setCountdown(0);
      setDone(false);
    }
  }, [open]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [countdown]);

  const sendCode = () => {
    setCodeSent(true);
    setCountdown(60);
  };

  return (
    <Modal open={open} onClose={onClose} title="Bind Phone Number">
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 size={36} className="text-success" />
          <p className="font-semibold">Phone number bound successfully</p>
          <Button fullWidth onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-md bg-white/5 p-3 text-xs text-[var(--text-secondary)]">
            <p className="mb-1 font-semibold text-[var(--text-primary)]">Important Notes</p>
            <ul className="space-y-0.5">
              <li>• Make sure to use a valid US phone number (+1)</li>
              <li>• The verification code is valid for 5 minutes</li>
              <li>• Each phone number can only be bound to one account</li>
            </ul>
          </div>
          <Input
            placeholder="Phone Number"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <div className="flex gap-2">
            <Input
              placeholder="Verification code"
              className="flex-1"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button
              variant="secondary"
              disabled={!phone || countdown > 0}
              onClick={sendCode}
              className="whitespace-nowrap px-4"
            >
              {countdown > 0 ? `${countdown}s` : 'Send code'}
            </Button>
          </div>
          <Button
            fullWidth
            disabled={!codeSent || !code}
            onClick={() => {
              updateProfile({ phoneBound: true });
              setDone(true);
            }}
          >
            Bind Phone
          </Button>
        </div>
      )}
    </Modal>
  );
}
