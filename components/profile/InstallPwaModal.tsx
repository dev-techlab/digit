'use client';

import { Share, MoreVertical, PlusSquare } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';

export function InstallPwaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Install PWA">
      <div className="space-y-3">
        <p className="text-sm text-[var(--text-secondary)]">
          Add Digit Link to your home screen for a faster, app-like experience.
        </p>
        <Card className="flex items-start gap-3 p-4">
          <Share size={18} className="mt-0.5 shrink-0 text-brand" />
          <div className="text-sm">
            <p className="font-semibold">iOS (Safari)</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Tap the Share icon, then choose &quot;Add to Home Screen&quot;.
            </p>
          </div>
        </Card>
        <Card className="flex items-start gap-3 p-4">
          <MoreVertical size={18} className="mt-0.5 shrink-0 text-brand" />
          <div className="text-sm">
            <p className="font-semibold">Android (Chrome)</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Tap the menu (⋮), then choose &quot;Install app&quot; or &quot;Add to Home
              screen&quot;.
            </p>
          </div>
        </Card>
        <Card className="flex items-start gap-3 p-4">
          <PlusSquare size={18} className="mt-0.5 shrink-0 text-brand" />
          <div className="text-sm">
            <p className="font-semibold">Desktop (Chrome/Edge)</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Click the install icon in the address bar, or open the browser menu and choose
              &quot;Install Digit Link&quot;.
            </p>
          </div>
        </Card>
      </div>
    </Modal>
  );
}
