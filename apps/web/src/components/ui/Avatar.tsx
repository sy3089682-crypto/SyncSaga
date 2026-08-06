import { cn } from '@/lib/utils';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away' | 'watching';
  className?: string;
}

const sizeMap = {
  sm: 'w-7 h-7 text-[0.625rem]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-2xl',
};

const statusColors = {
  online: 'bg-success',
  offline: 'bg-ink-mute',
  away: 'bg-amber',
  watching: 'bg-amber',
};

export function Avatar({ name, src, size = 'md', status, className }: AvatarProps) {
  const initial = name?.[0]?.toUpperCase() || '?';

  return (
    <div className={cn('relative inline-block shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn('rounded-full object-cover', sizeMap[size])}
        />
      ) : (
        <div
          className={cn(
            'rounded-full bg-gradient-to-br from-amber-strong to-amber/10 flex items-center justify-center font-semibold text-ink',
            sizeMap[size],
          )}
        >
          {initial}
        </div>
      )}
      {status && (
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-canvas',
            size === 'sm' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4',
            statusColors[status],
          )}
        />
      )}
    </div>
  );
}
