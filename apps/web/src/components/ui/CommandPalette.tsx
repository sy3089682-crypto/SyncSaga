'use client';

import { useState, useEffect, useRef, useCallback, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Search, Home, Tv, Users, Settings, Plus, LogOut, FileText,
  Command, Hash, Music, Star, Clock, UserPlus, Sparkles, Shield,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: any;
  action: () => void;
  shortcut?: string;
  category: string;
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(v => !v), []);
  const close = useCallback(() => setOpen(false), []);
  return { open, setOpen, toggle, close };
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { signOut } = useAuth();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  const commands: CommandItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, action: () => router.push('/dashboard'), shortcut: 'G D', category: 'Navigation' },
    { id: 'discover', label: 'Discover Rooms', icon: Tv, action: () => router.push('/discover'), shortcut: 'G R', category: 'Navigation' },
    { id: 'friends', label: 'Friends', icon: Users, action: () => router.push('/friends'), shortcut: 'G F', category: 'Navigation' },
    { id: 'settings', label: 'Settings', icon: Settings, action: () => router.push('/settings'), shortcut: 'G S', category: 'Navigation' },
    { id: 'search', label: 'Search Anime', icon: Search, action: () => router.push('/search'), shortcut: 'G A', category: 'Navigation' },
    { id: 'clips', label: 'Browse Clips', icon: FileText, action: () => router.push('/clips'), shortcut: 'G C', category: 'Navigation' },
    { id: 'profile', label: 'Profile', icon: Users, action: () => router.push('/profile'), shortcut: 'G P', category: 'Navigation' },
    { id: 'create-room', label: 'Create Room', icon: Plus, action: () => router.push('/room/create'), shortcut: 'C', category: 'Actions' },
    { id: 'signout', label: 'Sign Out', icon: LogOut, action: () => { signOut(); router.push('/'); }, shortcut: '', category: 'Actions' },
  ];

  const filtered = query
    ? commands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const categories = [...new Set(filtered.map(c => c.category))];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-lg mx-4 rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden"
            onClick={(e: MouseEvent) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-5 h-5 text-text-muted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Search commands..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted"
              />
              <kbd className="px-1.5 py-0.5 rounded bg-surface-light text-[10px] text-text-muted border border-border">
                ESC
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-sm">No results for &ldquo;{query}&rdquo;</div>
              ) : (
                categories.map(cat => (
                  <div key={cat}>
                    <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{cat}</div>
                    {filtered.filter(c => c.category === cat).map((cmd, i) => {
                      const idx = filtered.indexOf(cmd);
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => { cmd.action(); onClose(); }}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left',
                            idx === selectedIndex ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-light'
                          )}
                        >
                          <cmd.icon className="w-4 h-4 shrink-0" />
                          <span className="flex-1">{cmd.label}</span>
                          {cmd.shortcut && (
                            <kbd className="px-1.5 py-0.5 rounded bg-surface-light text-[10px] text-text-muted border border-border">
                              {cmd.shortcut}
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
