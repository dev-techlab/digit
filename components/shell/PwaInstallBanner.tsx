'use client';

import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';

export function PwaInstallBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(sessionStorage.getItem('pwa-banner-dismissed') === '1');
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem('pwa-banner-dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="glass mx-4 mt-3 flex items-center gap-3 rounded-lg border px-4 py-3">
      <Download size={18} className="shrink-0 text-brand" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">Install PWA</p>
        <p className="text-xs text-[var(--text-secondary)]">Add Digit Link to your home screen</p>
      </div>
      <button onClick={dismiss} aria-label="Dismiss" className="rounded-full p-1 hover:bg-white/10">
        <X size={16} />
      </button>
    </div>
  );
}
