'use client';

import { useState } from 'react';
import { Headset } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { HelpCenterForm } from '@/components/legal/HelpCenterForm';

export function SupportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Support"
        className="fixed bottom-24 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-brand-solid text-white shadow-glowBrand lg:bottom-8 lg:right-8"
      >
        <Headset size={22} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Support">
        <HelpCenterForm />
      </Modal>
    </>
  );
}
