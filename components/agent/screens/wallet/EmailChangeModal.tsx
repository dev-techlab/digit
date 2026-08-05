'use client';

import { useState } from 'react';
import { api, Btn, Field, Modal, TextInput } from '../../ui';

interface Props {
  open: boolean;
  onClose: () => void;
  currentEmail: string | null;
  mutate: () => void;
  flash: (ok: boolean, text: string) => void;
}

function maskEmail(email: string | null) {
  if (!email) return '-';
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}***@${domain ?? ''}`;
}

export function EmailChangeModal({ open, onClose, currentEmail, mutate, flash }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep(1);
      setCode('');
      setCodeSent(false);
      setNewEmail('');
    }, 200);
  };

  return (
    <Modal
      title="Change Email"
      open={open}
      onClose={handleClose}
      footer={
        step === 1 ? (
          <>
            <Btn variant="ghost" onClick={handleClose}>
              Cancel
            </Btn>
            <Btn disabled={code.length !== 6} onClick={() => setStep(2)}>
              Verify
            </Btn>
          </>
        ) : (
          <>
            <Btn variant="ghost" onClick={handleClose}>
              Cancel
            </Btn>
            <Btn
              disabled={!newEmail.includes('@')}
              onClick={async () => {
                try {
                  await api('/api/agent/wallet', {
                    method: 'PUT',
                    body: JSON.stringify({ email: newEmail }),
                  });
                  flash(true, 'Email updated');
                  mutate();
                  handleClose();
                } catch (e) {
                  flash(false, (e as Error).message);
                }
              }}
            >
              Confirm
            </Btn>
          </>
        )
      }
    >
      {step === 1 ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-100 px-5 py-4">
            <p className="text-lg font-medium text-slate-600">Security Verification</p>
            <p className="mt-1 text-sm text-slate-500">
              To protect your account, please verify your current email first.
            </p>
          </div>
          <div className="rounded-lg bg-blue-50/60 px-5 py-4">
            <p className="text-sm">
              <span className="font-semibold text-slate-600">Current Email: </span>
              <span className="font-semibold text-blue-500">{maskEmail(currentEmail)}</span>
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <TextInput
                maxLength={6}
                placeholder="Please enter 6-digit verification code"
                value={code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value.replace(/\D/g, ''))}
              />
              <Btn
                className="shrink-0 justify-center"
                disabled={codeSent}
                onClick={() => {
                  setCodeSent(true);
                  setTimeout(() => setCodeSent(false), 30000);
                }}
              >
                {codeSent ? 'Code Sent' : 'Send Code'}
              </Btn>
            </div>
          </div>
        </div>
      ) : (
        <Field label="New Email" required hint="A verification email will be sent to this address.">
          <TextInput
            type="email"
            placeholder="name@example.com"
            value={newEmail}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEmail(e.target.value)}
          />
        </Field>
      )}
    </Modal>
  );
}
