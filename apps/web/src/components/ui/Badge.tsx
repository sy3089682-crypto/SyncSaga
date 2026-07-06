import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', size = 'sm', dot, children, ...props }, ref) => {
    const variants = {
      default: 'bg-gray-100 dark:bg-white/10 text-foreground dark:text-white/80',
      primary: 'bg-accent/20 dark:bg-accent/20 text-accent dark:text-accent font-semibold',
      success: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
      warning: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
      error: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
      info: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
      neutral: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200',
    };

    const sizes = {
      xs: 'px-2 py-0.5 text-xs',
      sm: 'px-2.5 py-1 text-xs',
      md: 'px-3 py-1.5 text-sm',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span className={cn(
            'w-1.5 h-1.5 rounded-full',
            variant === 'primary' && 'bg-accent',
            variant === 'success' && 'bg-green-500',
            variant === 'warning' && 'bg-yellow-500',
            variant === 'error' && 'bg-red-500',
            variant === 'info' && 'bg-blue-500',
            variant === 'default' && 'bg-gray-400 dark:bg-white/40',
            variant === 'neutral' && 'bg-gray-500',
          )} />
        )}
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';
