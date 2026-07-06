import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'outline' | 'phoneRegister';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-brand-solid text-white shadow-glowBrand hover:brightness-110 active:brightness-95 disabled:bg-white/[0.04] disabled:text-white/25 disabled:shadow-none',
  secondary:
    'bg-white/5 text-[var(--text-primary)] border border-white/10 hover:bg-white/10 disabled:opacity-40',
  outline: 'bg-transparent border border-brand text-brand hover:bg-brand/10 disabled:opacity-40',
  phoneRegister:
    'bg-[#14b096] text-white hover:bg-[#1ec8b4] shadow-[0_4px_12px_rgba(0,77,64,0.35)] disabled:opacity-40',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', fullWidth, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-pill px-6 py-3 text-[15px] font-semibold transition-all duration-150 disabled:cursor-not-allowed',
          variantClasses[variant],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
