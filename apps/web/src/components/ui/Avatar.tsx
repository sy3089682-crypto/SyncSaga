'use client';

import { cn } from '@/lib/utils';
import { type HTMLAttributes, forwardRef } from 'react';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline' | 'sync' | 'none';
  glowColor?: 'amber' | 'success' | 'error';
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    { src, alt = '', name = '', size = 'md', status, glowColor, className, ...props },
    ref,
  ) => {
    const sizeClasses = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-lg' };
    const initial = (name && name.length > 0) ? name[0].toUpperCase() : '?';

    const statusColors: Record<string, string> = {
      online: 'bg-success',
      offline: 'bg-ink-mute',
      sync: 'bg-amber animate-[syncPulse_3s_ease-in-out_infinite]',
      host: 'bg-amber',
    };

    const glowMap = { accent: 'amber-glow', success: 'success/30', error: 'error/30' };

    return (
      <div ref={ref} className={cn('relative shrink-0', className)} {...props}>
        {src ? (
          <img
            src={src} alt={alt} referrerPolicy="no-referrer"
            className={cn('rounded-full object-cover border-2 border-surface', sizeClasses[size])}
          />
        ) : (
          <div
            className={cn(
              'rounded-full flex items-center justify-center font-medium',
              'bg-surface-alt text-ink-soft border-2 border-surface',
              sizeClasses[size],
            )}
          >
            {initialClasses}
          </div>
        )}

        {status && (
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface',
              statusColors[status],
              glowColor && `shadow-[0_0_6px_2px_var(--${glowMap[glowColor]})]`
            )}
          />
        )}
      </div>
    );
  },
);

Avatar.displayName = 'Avatar';
export { Avatar };
