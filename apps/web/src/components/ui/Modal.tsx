'use client';

import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useCallback, type ReactNode } from 'react';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  showClose?: boolean;
}

export function Modal({
  open, onClose, title, subtitle, children, size = 'md', showClose = true,
}: ModalProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            className={cn(
              'relative w-full rounded-xl bg-elevated border border-border',
              'shadow-[0_12px_48px_-8px_rgba(0,0,0,0.4)]',
              sizeClasses[size],
            )}
          >
            {(title || showClose) && (
              <div className="flex items-start justify-between p-5 pb-0">
                <div>
                  {title && <h2 className="text-lg font-medium text-ink">{title}</h2>}
                  {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
                </div>
                {showClose && (
                  <Button variant="icon" size="sm" onClick={onClose} aria-label="Close">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
