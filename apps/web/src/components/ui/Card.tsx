import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'outline' | 'elevated' | 'bordered';
  padding?: 'sm' | 'md' | 'lg' | 'none';
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', padding = 'md', interactive, children, ...props }, ref) => {
    const variants = {
      default: 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10',
      glass: 'glass-card',
      outline: 'border border-gray-200 dark:border-white/10 bg-transparent',
      elevated: 'bg-white dark:bg-white/5 shadow-lg dark:shadow-none border border-gray-200 dark:border-white/10',
      bordered: 'border-2 border-accent/20 bg-accent/5 dark:bg-accent/10',
    };

    const paddingStyles = {
      sm: 'p-3',
      md: 'p-6',
      lg: 'p-8',
      none: 'p-0',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl transition-all duration-300',
          variants[variant],
          paddingStyles[padding],
          interactive && 'hover:shadow-lg dark:hover:shadow-xl hover:border-accent/50 cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export function CardHeader({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4 flex items-start justify-between', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-semibold text-foreground dark:text-white', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className = '', children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-foreground-secondary dark:text-white/60 mt-1', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-4', className)} {...props}>{children}</div>;
}

export function CardFooter({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-6 flex items-center justify-between border-t border-gray-200 dark:border-white/10 pt-4', className)} {...props}>
      {children}
    </div>
  );
}
