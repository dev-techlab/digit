'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

/**
 * Sub-page header used by inner routes (Transactions, Help Center, …):
 * a circular back button on the left with a centered title.
 */
export function PageHeader({ title, backHref }: { title: string; backHref?: string }) {
  const router = useRouter();

  return (
    <div className="relative mb-6 flex items-center justify-center">
      <button
        onClick={() => (backHref ? router.push(backHref) : router.back())}
        aria-label="Go back"
        className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[var(--text-primary)] transition-colors hover:bg-white/20"
      >
        <ArrowLeft size={18} />
      </button>
      <h1 className="text-lg font-bold">{title}</h1>
    </div>
  );
}
