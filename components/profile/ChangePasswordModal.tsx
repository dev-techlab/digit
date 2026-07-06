'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Lock, Eye, EyeOff, Info } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

function PasswordField({
  label,
  placeholder,
  value,
  error,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  error?: boolean;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="mb-2 flex items-center gap-1 text-sm font-semibold text-[var(--text-primary)]">
        <span className="text-danger">*</span>
        {label}
      </label>
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border bg-[var(--input-bg)] pl-2 pr-3 transition-shadow',
          error
            ? 'border-danger focus-within:shadow-glowDanger'
            : 'border-[var(--input-border)] focus-within:border-brand focus-within:shadow-glowBrand'
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-[var(--text-secondary)]">
          <Lock size={16} />
        </span>
        <input
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent py-3 text-[15px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="shrink-0 rounded p-0.5 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setNext('');
      setConfirm('');
      setDone(false);
    }
  }, [open]);

  const mismatch = confirm.length > 0 && next !== confirm;
  const invalid = next.length < 6 || confirm.length === 0 || mismatch;

  return (
    <Modal open={open} onClose={onClose} title="Change Password">
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 size={36} className="text-success" />
          <p className="font-semibold">Password updated successfully</p>
          <Button fullWidth onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <PasswordField
            label="New Password"
            placeholder="Enter new password"
            value={next}
            onChange={setNext}
          />
          <PasswordField
            label="Confirm Password"
            placeholder="Enter new password again"
            value={confirm}
            error={mismatch}
            onChange={setConfirm}
          />
          {mismatch && <p className="-mt-1 text-xs text-danger">Passwords do not match</p>}

          <div className="flex gap-3 rounded-lg border border-[var(--card-border)] bg-white/[0.03] p-4">
            <Info size={16} className="mt-0.5 shrink-0 text-[var(--text-secondary)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Password Requirements:
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-[var(--text-secondary)]">
                <li className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span>Password must be at least 6 characters</span>
                </li>
                <li className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span>New password cannot be the same as current password</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" fullWidth onClick={onClose}>
              Cancel
            </Button>
            <Button fullWidth disabled={invalid} onClick={() => setDone(true)}>
              Confirm Change
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
