import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid';
}

export function Card({ className, variant = 'glass', ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border',
        variant === 'glass' ? 'glass' : 'border-[var(--card-border)] bg-[var(--card-bg-solid)]',
        className
      )}
      {...props}
    />
  );
}
