import { HTMLAttributes, forwardRef } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'premium';
  size?: 'sm' | 'md';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', size = 'sm', children, ...props }, ref) => {
    const variants = {
      default: 'bg-white/10 text-text-secondary',
      success: 'bg-green-500/10 text-green-400',
      warning: 'bg-yellow-500/10 text-yellow-400',
      error: 'bg-red-500/10 text-red-400',
      info: 'bg-blue-500/10 text-blue-400',
      premium: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center gap-1 rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';
