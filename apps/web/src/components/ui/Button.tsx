import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger' | 'destructive';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, fullWidth, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95',
          {
            'bg-accent text-white hover:bg-green-600 dark:hover:bg-green-500 shadow-md hover:shadow-lg': variant === 'primary',
            'bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/20 text-foreground dark:text-white hover:bg-gray-200 dark:hover:bg-white/20': variant === 'secondary',
            'bg-transparent border border-gray-200 dark:border-white/20 text-foreground dark:text-white hover:bg-gray-50 dark:hover:bg-white/5': variant === 'tertiary',
            'bg-transparent text-foreground dark:text-white hover:bg-gray-100 dark:hover:bg-white/10': variant === 'ghost',
            'bg-red-500 text-white hover:bg-red-600 shadow-md hover:shadow-lg': variant === 'danger' || variant === 'destructive',
            'w-full': fullWidth,
            'px-2.5 py-1.5 text-xs': size === 'xs',
            'px-3 py-2 text-sm': size === 'sm',
            'px-4 py-2.5 text-base': size === 'md',
            'px-6 py-3 text-lg': size === 'lg',
            'px-8 py-4 text-xl': size === 'xl',
          },
          className
        )}
        {...props}
      >
        {isLoading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
