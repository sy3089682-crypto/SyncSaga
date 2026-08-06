'use client';

import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';
type Toast = {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
};

interface ToastContextValue {
  toast: (opts: { type: ToastType; message: string; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const typeClasses: Record<ToastType, string> = {
  success: 'border-success/30 bg-success/10 text-success',
  error: 'border-error/30 bg-error/10 text-error',
  info: 'border-amber/30 bg-amber-strong text-amber',
  warning: 'border-amber/30 bg-amber-strong text-amber',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((opts: { type: ToastType; message: string; duration?: number }) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...opts, id }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), opts.duration || 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => {
            const Icon = icons[t.type];
            return (
              <motion.div
                key={t.id}
                initial={{ x: 320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 320, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.1, duration: 0.5 }}
                className={cn(
                  'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border',
                  'bg-elevated shadow-lg backdrop-blur-sm min-w-[280px]',
                  typeClasses[t.type],
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-sm flex-1">{t.message}</span>
                <button onClick={() => setToasts(prev => prev.filter(s => s.id !== t.id))} className="text-current/60 hover:text-current shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
