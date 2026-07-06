'use client';

import { Lock, Phone, Mail, ChevronRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

interface SecuritySettingsModalProps {
  open: boolean;
  onClose: () => void;
  onChangePassword: () => void;
  onBindPhone: () => void;
}

export function SecuritySettingsModal({
  open,
  onClose,
  onChangePassword,
  onBindPhone,
}: SecuritySettingsModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Security Settings">
      <div className="divide-y divide-[var(--divider-color)] overflow-hidden rounded-md border border-[var(--card-border)]">
        <button
          onClick={() => {
            onClose();
            onChangePassword();
          }}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-white/5"
        >
          <Lock size={17} className="text-[var(--text-secondary)]" />
          <span className="flex-1 text-sm">Change Password</span>
          <ChevronRight size={16} className="text-[var(--text-secondary)]" />
        </button>
        <button
          onClick={() => {
            onClose();
            onBindPhone();
          }}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-white/5"
        >
          <Phone size={17} className="text-[var(--text-secondary)]" />
          <span className="flex-1 text-sm">Bind Phone</span>
          <Badge tone="warning">Not Bound</Badge>
        </button>
        <div className="flex w-full items-center gap-3 px-4 py-3.5">
          <Mail size={17} className="text-[var(--text-secondary)]" />
          <span className="flex-1 text-sm">Bind Email</span>
          <Badge tone="neutral">Optional</Badge>
        </div>
      </div>
      <p className="mt-3 text-xs text-[var(--text-secondary)]">
        Binding a phone number and enabling a strong password helps keep your account and balance
        secure.
      </p>
    </Modal>
  );
}
