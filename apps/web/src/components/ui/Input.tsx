'use client';

import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-xs text-ink-mute font-medium tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full bg-surface-alt text-ink border border-border rounded-md px-3.5 py-2.5',
            'placeholder:text-ink-faint text-[0.9375rem] font-[420]',
            'transition-all duration-200 ease-spring',
            'focus:outline-none focus:border-amber focus:shadow-glow-amber',
            error && 'border-error/40 focus:border-error',
            className,
          )}
          {...props}
        />
        {error && <span className="text-xs text-error">{error}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';
