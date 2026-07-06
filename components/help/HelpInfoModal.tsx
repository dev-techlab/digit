'use client';

import { Play } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import type { HelpItem } from '@/lib/help-content';

export function HelpInfoModal({ item, onClose }: { item: HelpItem | null; onClose: () => void }) {
  const open = !!item && item.kind !== 'guide';

  return (
    <Modal open={open} onClose={onClose} title={item?.title}>
      {item?.kind === 'video' ? (
        <div className="space-y-3">
          <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-[var(--card-border)] bg-black/40">
            <div className="absolute inset-0 bg-gradient-to-br from-brand/20 to-[#7c3aed]/20" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
              <Play size={26} fill="currentColor" />
            </span>
          </div>
          <p className="text-center text-sm text-[var(--text-secondary)]">
            Video walkthrough — tap play to watch the full tutorial.
          </p>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{item?.body}</p>
      )}
    </Modal>
  );
}
