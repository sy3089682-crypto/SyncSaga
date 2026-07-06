import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'py-8 px-4',
  md: 'py-16 px-8',
  lg: 'py-24 px-12',
};

const iconSizes = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
};

const titleSizes = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  size = 'md',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeStyles[size],
        className
      )}
    >
      {icon && (
        <div className={cn(
          'mb-4 text-foreground-secondary dark:text-white/40',
          iconSizes[size]
        )}>
          {icon}
        </div>
      )}

      <h3 className={cn(
        'font-semibold text-foreground dark:text-white mb-2',
        titleSizes[size]
      )}>
        {title}
      </h3>

      {description && (
        <p className="text-foreground-secondary dark:text-white/60 max-w-md mb-6">
          {description}
        </p>
      )}

      {action && (
        <Button
          variant={action.variant || 'primary'}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
