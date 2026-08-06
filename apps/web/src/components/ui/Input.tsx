'use client';

import { cn } from '@/lib/utils';
import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'ghost';
  inputSize?: 'sm' | 'md' | 'lg';
  error?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'default', inputSize = 'md', error, icon, iconRight, className, ...props }, ref) => {

    const sizeClasses = {
      sm: 'h-9 px-3 text-sm',
      md: 'h-10 px-3.5 text-base',
      lg: 'h-12 px-4 text-lg',
    };

    const variantClasses = {
      default: 'bg-canvas border-border focus:border-amber focus:ring-amber-glow/30',
      ghost: 'bg-transparent border-transparent hover:border-border focus:border-amber',
    };

    return (
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-md border outline-none font-body text-ink placeholder:text-ink-faint',
            'transition-colors duration-200 focus:ring-2 focus:ring-offset-0',
            variantClasses[variant],
            sizeClasses[inputSize],
            icon && 'pl-9',
            iconRight && 'pr-9',
            error && 'border-error focus:border-error focus:ring-error/30',
            className,
          )}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute pointer-events-none">
            {iconRight}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
export { Input };
