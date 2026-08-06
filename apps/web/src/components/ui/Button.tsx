import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-200 ease-[cubic-bezier(0.22,0.61,0.36,1)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'active:scale-[0.97] active:transition-transform active:duration-[80ms]',
          // Variants
          {
            // Primary: amber CTA — used for play/pause, etc.
            'bg-amber text-canvas shadow-[0_0_20px_1px_var(--amber-glow)] hover:bg-amber-hover hover:shadow-[0_0_28px_3px_var(--amber-strong)]':
              variant === 'primary',
            // Secondary: bordered ghost
            'bg-white/3 text-ink border border-border hover:bg-white/6 hover:border-border-hover':
              variant === 'secondary',
            // Ghost: borderless, subtle
            'text-ink-soft hover:text-ink hover:bg-surface':
              variant === 'ghost',
            // Icon: ghost with equal padding (square button)
            'text-ink-soft hover:text-ink hover:bg-surface p-2 rounded-md min-h-[36px] min-w-[36px]':
              variant === 'icon',

            // Danger: warm error
            'bg-error text-canvas':
              variant === 'danger',
            // Sizes
            'px-3 py-1.5 text-sm rounded-md min-h-[36px]': size === 'sm',
            'px-4 py-2.5 text-base rounded-md min-h-[44px]': size === 'md',
            'px-6 py-3 text-lg rounded-md': size === 'lg',
          },
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
