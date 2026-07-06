'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { ReactNode } from 'react';

export function LegalPageLayout({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();

  return (
    <div>
      <div className="bg-[var(--bg-primary)]/95 sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--card-border)] px-4 py-3 backdrop-blur">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="rounded-full p-1.5 hover:bg-white/10"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base font-bold">{title}</h1>
      </div>
      <div className="space-y-4 px-4 py-5 text-sm leading-relaxed text-[var(--text-secondary)]">
        {children}
      </div>
    </div>
  );
}
