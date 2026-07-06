import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/cn';

interface IconInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: ReactNode;
  label?: string;
  labelAction?: ReactNode;
  trailing?: ReactNode;
  error?: boolean;
}

export const IconInput = forwardRef<HTMLInputElement, IconInputProps>(
  ({ icon, label, labelAction, trailing, error, className, ...props }, ref) => {
    return (
      <div>
        {(label || labelAction) && (
          <div className="mb-1.5 flex items-center justify-between">
            {label && (
              <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                {label}
              </span>
            )}
            {labelAction}
          </div>
        )}
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
            {icon}
          </span>
          <input
            ref={ref}
            className={cn(
              'w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] py-3 pl-11 text-[15px] text-[var(--text-primary)] outline-none transition-shadow placeholder:text-[var(--text-secondary)]',
              trailing ? 'pr-11' : 'pr-4',
              'focus:border-brand focus:shadow-glowBrand',
              error && 'border-danger focus:shadow-glowDanger',
              className
            )}
            {...props}
          />
          {trailing && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
              {trailing}
            </span>
          )}
        </div>
      </div>
    );
  }
);
IconInput.displayName = 'IconInput';
