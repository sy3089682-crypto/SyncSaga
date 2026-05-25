'use client';

import { useEffect } from 'react';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  handler: () => void;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      for (const s of shortcuts) {
        const matchKey = e.key.toLowerCase() === s.key.toLowerCase();
        const matchCtrl = s.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const matchShift = s.shift ? e.shiftKey : !e.shiftKey;
        if (matchKey && matchCtrl && matchShift) {
          if (s.preventDefault !== false) e.preventDefault();
          s.handler();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcuts]);
}
