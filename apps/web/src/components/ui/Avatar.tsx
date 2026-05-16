import { cn } from '@/lib/utils';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away' | 'watching';
  className?: string;
}

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

const statusColors = {
  online: 'bg-accent-green',
  offline: 'bg-text-muted',
  away: 'bg-yellow-500',
  watching: 'bg-primary',
};

export function Avatar({ name, src, size = 'md', status, className }: AvatarProps) {
  const initial = name?.[0]?.toUpperCase() || '?';

  return (
    <div className={cn('relative inline-block', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn('rounded-full object-cover', sizeMap[size])}
        />
      ) : (
        <div
          className={cn(
            'rounded-full bg-gradient-to-br from-primary/30 to-accent-cyan/30 flex items-center justify-center font-semibold text-text-primary',
            sizeMap[size]
          )}
        >
          {initial}
        </div>
      )}
      {status && (
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-background',
            size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-3.5 h-3.5' : 'w-4 h-4',
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}
