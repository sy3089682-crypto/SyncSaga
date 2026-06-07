'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';


export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const { token } = useAppStore();

  useEffect(() => {
    if (!token || !open) return;
    api.get<any>('/api/notifications', token)
      .then((data: any) => setNotifications(data.notifications || []))
      .catch(console.error);
  }, [open, token]);

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)}
        className="p-2 text-text-secondary hover:text-accent-cyan transition-colors relative"
      >
        <Bell className="w-5 h-5" />
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent-pink rounded-full" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 glass-panel shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-3 border-b border-border-default font-semibold text-sm flex justify-between items-center">
              <span>Notifications</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-text-muted text-sm">
                  You're all caught up!
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="p-3 border-b border-border-subtle hover:bg-bg-highlight transition-colors cursor-pointer text-sm">
                    {n.message}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
