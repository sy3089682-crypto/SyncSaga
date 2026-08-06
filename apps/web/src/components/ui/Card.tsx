'use client';

import { cn } from '@/lib/utils';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';

type Variant = 'default' | 'elevated' | 'ghost' | 'accent-border';

interface CardProps extends HTMLMotionProps<'div'> {
  variant?: Variant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', hover = false, className, children, ...props }, ref) => {

    const variantClasses: Record<Variant, string> = {
      default: 'bg-surface border border-border',
      elevated: 'bg-elevated border border-border-hover shadow-lg shadow-black/20',
      ghost: 'bg-transparent border border-transparent hover:border-border',
      accent: 'bg-surface border border-border hover:border-amber/25',
    };

    const paddingClasses = {
      none: 'p-0',
      sm: 'p-3',
      md: 'p-5',
      lg: 'p-8',
    };

    return (
      <motion.div
        ref={ref}
        whileHover={hover ? { y: -2, transition: { type: 'spring', bounce: 0, duration: 0.35 } } : undefined}
        className={cn(
          'rounded-lg overflow-hidden',
          // Luminance-stepping: Card sits ON Surface, never on Canvas directly
          variantClasses[variant],
          // Hover: subtle border-lighten (Linear method)
          hover && 'transition-colors duration-200 hover:border-border-hover',
          paddingClasses[padding],
          className,
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);

Card.displayName = 'Card';
export { Card };
export type { Props as CardProps };
