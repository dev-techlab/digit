'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { HelpItemIconBadge } from './HelpItemIconBadge';
import { cn } from '@/lib/cn';
import type { HelpItem } from '@/lib/help-content';

export function StepGuideModal({ item, onClose }: { item: HelpItem | null; onClose: () => void }) {
  const [index, setIndex] = useState(0);

  // Reset to the first step whenever a new guide is opened.
  useEffect(() => {
    setIndex(0);
  }, [item?.id]);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIndex((i) => Math.min((item.steps?.length ?? 1) - 1, i + 1));
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [item, onClose]);

  if (!item || typeof document === 'undefined') return null;

  const steps = item.steps ?? [];
  const step = steps[index];
  const atStart = index === 0;
  const atEnd = index === steps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex max-h-[90dvh] w-full max-w-md animate-modalScaleIn flex-col overflow-y-auto rounded-2xl border border-[var(--card-border)] bg-[var(--drawer-bg)] p-5 shadow-2xl">
        {/* Title */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="flex-1 text-center text-lg font-bold leading-snug">{item.title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[var(--text-secondary)] hover:bg-white/20"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step title bar */}
        <div className="rounded-xl border border-brand/30 bg-brand/[0.08] px-4 py-3 text-center text-sm font-semibold text-[var(--text-primary)]">
          {index + 1}. {step.title}
        </div>

        {/* Slide + arrows */}
        <div className="relative mt-4 flex items-center">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={atStart}
            aria-label="Previous step"
            className={cn(
              'absolute -left-1 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-brand/30 bg-[var(--drawer-bg)] text-brand transition-opacity',
              atStart ? 'pointer-events-none opacity-30' : 'hover:bg-brand/10'
            )}
          >
            <ChevronLeft size={18} />
          </button>

          <div className="mx-auto flex min-h-[280px] w-[78%] flex-col items-center justify-center gap-4 rounded-2xl border border-[var(--card-border)] bg-white/[0.04] p-6 text-center">
            <HelpItemIconBadge icon={item.icon} size="lg" />
            <span className="rounded-pill bg-white/10 px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
              Step {index + 1} of {steps.length}
            </span>
            <p className="text-base font-semibold">{step.title}</p>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {step.description}
            </p>
          </div>

          <button
            onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
            disabled={atEnd}
            aria-label="Next step"
            className={cn(
              'absolute -right-1 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-brand/30 bg-[var(--drawer-bg)] text-brand transition-opacity',
              atEnd ? 'pointer-events-none opacity-30' : 'hover:bg-brand/10'
            )}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Dots */}
        <div className="mt-5 flex items-center justify-center gap-1.5">
          {steps.map((s, i) => (
            <button
              key={s.title}
              onClick={() => setIndex(i)}
              aria-label={`Go to step ${i + 1}`}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === index ? 'w-6 bg-brand-solid' : 'w-1.5 bg-white/25 hover:bg-white/40'
              )}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
