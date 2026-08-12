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
      <div className="space-y-4 px-4 py-5 text-sm leading-relaxed text-[var(--text-secondary)] [&_a]:text-blue-500 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-slate-200 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </div>
    </div>
  );
}
