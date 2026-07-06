'use client';

import { cn } from '@/lib/cn';

interface TabOption {
  value: string;
  label: string;
}

interface TabsProps {
  options: TabOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ options, value, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        'relative grid rounded-pill border border-[var(--input-border)] bg-[var(--input-bg)] p-1',
        className
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative z-10 rounded-pill px-4 py-2 text-sm font-semibold transition-colors',
              active
                ? 'bg-brand-solid text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
