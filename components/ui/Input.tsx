import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-[15px] text-[var(--text-primary)] outline-none transition-shadow placeholder:text-[var(--text-secondary)]',
          'focus:border-brand focus:shadow-glowBrand',
          error && 'border-danger focus:shadow-glowDanger',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
