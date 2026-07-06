import { cn } from '@/lib/utils';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  status?: 'online' | 'offline' | 'away' | 'busy' | 'idle';
  className?: string;
  initials?: boolean;
}

const sizeMap = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
  xxl: 'w-28 h-28 text-4xl',
};

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-gray-400 dark:bg-gray-600',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  idle: 'bg-gray-500',
};

const gradients = [
  'from-blue-400 to-blue-600',
  'from-purple-400 to-purple-600',
  'from-pink-400 to-pink-600',
  'from-orange-400 to-orange-600',
  'from-green-400 to-green-600',
  'from-cyan-400 to-cyan-600',
];

function getGradient(name: string): string {
  const hash = name.charCodeAt(0) + name.charCodeAt(name.length - 1);
  return gradients[hash % gradients.length];
}

export function Avatar({ name, src, size = 'md', status, className, initials }: AvatarProps) {
  const getInitials = (fullName: string) => {
    const parts = fullName.split(' ');
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  };

  const displayText = initials ? getInitials(name) : name[0]?.toUpperCase() || '?';

  return (
    <div className={cn('relative inline-block flex-shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn('rounded-full object-cover ring-2 ring-transparent', sizeMap[size])}
          loading="lazy"
        />
      ) : (
        <div
          className={cn(
            'rounded-full bg-gradient-to-br flex items-center justify-center font-semibold text-white ring-2 ring-transparent',
            `${getGradient(name)}`,
            sizeMap[size]
          )}
        >
          {displayText}
        </div>
      )}
      {status && (
        <div
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-gray-900 ring-1 ring-gray-200 dark:ring-gray-800',
            size === 'xs' && 'w-2 h-2',
            size === 'sm' && 'w-2.5 h-2.5',
            size === 'md' && 'w-3 h-3',
            size === 'lg' && 'w-4 h-4',
            (size === 'xl' || size === 'xxl') && 'w-5 h-5',
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}
