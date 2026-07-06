'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

export function LanguageModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState('en');

  return (
    <Modal open={open} onClose={onClose} title="Display Language">
      <div className="space-y-1">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => {
              setSelected(lang.code);
              onClose();
            }}
            className={cn(
              'flex w-full items-center justify-between rounded-md px-4 py-3 text-left text-sm hover:bg-white/5',
              selected === lang.code && 'text-brand'
            )}
          >
            {lang.label}
            {selected === lang.code && <Check size={16} />}
          </button>
        ))}
      </div>
    </Modal>
  );
}
