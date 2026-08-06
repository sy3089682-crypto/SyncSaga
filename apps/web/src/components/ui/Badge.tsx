'use client';

import { cn } from '@/lib/utils';
import { type HTMLAttributes, forwardRef } from 'react';

type Variant = 'accent' | 'success' | 'error' | 'neutral';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  glow?: boolean;
  size?: 'sm' | 'md';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', glow = false, size = 'md', className, children, ...props }, ref) => {

    const variantClasses: Record<Variant, string> = {
      accent: 'bg-amber-strong text-amber',
      success: 'bg-success/15 text-success',
      error: 'bg-error/15 text-error',
      neutral: 'bg-border text-ink-mute',
    };

    const sizeClasses = {
      sm: 'text-[0.625rem] px-1.5 py-0',
      md: 'text-[0.6875rem] px-2 py-0.5',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-medium leading-none select-none whitespace-nowrap',
          variantClasses[variant],
          sizeClasses[size],
          glow && variant === 'accent' && 'shadow-[0_0_10px_2px_var(--amber-glow)]',
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';
export { Badge };
BADGEOF
echo "Badge.tsx written — $(wc -l < /tmp/syncsaga/apps/web/src/components/ui/Badge.tsx) lines"
