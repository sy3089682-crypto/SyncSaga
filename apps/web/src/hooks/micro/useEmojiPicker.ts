'use client';

import { useState, useCallback, useMemo, useRef } from 'react';

export interface EmojiCategory {
  name: string;
  emojis: string[];
}

export interface Emoji {
  emoji: string;
  name: string;
  category: string;
}

export interface UseEmojiPickerOptions {
  categories?: string[];
  onSelect?: (emoji: string) => void;
  maxRecent?: number;
  showRecent?: boolean;
}

export function useEmojiPicker(options: UseEmojiPickerOptions = {}) {
  const { 
    categories = ['recent', 'smileys', 'people', 'nature', 'food', 'activities', 'objects', 'symbols'],
    onSelect,
    maxRecent = 12,
    showRecent = true,
  } = options;
  
  const [selectedCategory, setSelectedCategory] = useState<string>('smileys');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Comprehensive emoji list by category
  const allEmojis: Record<string, Emoji[]> = useMemo(() => ({
    smileys: [
      { emoji: '😀', name: 'Grinning Face', category: 'smileys' },
      { emoji: '😃', name: 'Grinning Face with Big Eyes', category: 'smileys' },
      { emoji: '😄', name: 'Grinning Face with Smiling Eyes', category: 'smileys' },
      { emoji: '😁', name: 'Beaming Face with Smiling Eyes', category: 'smileys' },
      { emoji: '😆', name: 'Grinning Squinting Face', category: 'smileys' },
      { emoji: '😅', name: 'Grinning Face with Sweat', category: 'smileys' },
      { emoji: '😂', name: 'Face with Tears of Joy', category: 'smileys' },
      { emoji: '🤣', name: 'Rolling on the Floor Laughing', category: 'smileys' },
      { emoji: '😊', name: 'Smiling Face with Smiling Eyes', category: 'smileys' },
      { emoji: '😇', name: 'Smiling Face with Halo', category: 'smileys' },
    ],
    people: [
      { emoji: '👋', name: 'Waving Hand', category: 'people' },
      { emoji: '🤚', name: 'Raised Back of Hand', category: 'people' },
      { emoji: '🖐️', name: 'Hand with Fingers Splayed', category: 'people' },
      { emoji: '✋', name: 'Raised Hand', category: 'people' },
      { emoji: '👍', name: 'Thumbs Up', category: 'people' },
      { emoji: '👎', name: 'Thumbs Down', category: 'people' },
      { emoji: '👏', name: 'Clapping Hands', category: 'people' },
      { emoji: '🙌', name: 'Raising Hands', category: 'people' },
      { emoji: '🤝', name: 'Handshake', category: 'people' },
      { emoji: '🙏', name: 'Folded Hands', category: 'people' },
    ],
    nature: [
      { emoji: '🐶', name: 'Dog Face', category: 'nature' },
      { emoji: '🐱', name: 'Cat Face', category: 'nature' },
      { emoji: '🐭', name: 'Mouse Face', category: 'nature' },
      { emoji: '🐹', name: 'Hamster', category: 'nature' },
      { emoji: '🐰', name: 'Rabbit Face', category: 'nature' },
      { emoji: '🦊', name: 'Fox', category: 'nature' },
      { emoji: '🐻', name: 'Bear', category: 'nature' },
      { emoji: '🐼', name: 'Panda', category: 'nature' },
      { emoji: '🦁', name: 'Lion', category: 'nature' },
      { emoji: '🐯', name: 'Tiger', category: 'nature' },
    ],
    food: [
      { emoji: '🍎', name: 'Red Apple', category: 'food' },
      { emoji: '🍊', name: 'Tangerine', category: 'food' },
      { emoji: '🍋', name: 'Lemon', category: 'food' },
      { emoji: '🍌', name: 'Banana', category: 'food' },
      { emoji: '🍉', name: 'Watermelon', category: 'food' },
      { emoji: '🍇', name: 'Grapes', category: 'food' },
      { emoji: '🍓', name: 'Strawberry', category: 'food' },
      { emoji: '🍕', name: 'Pizza', category: 'food' },
      { emoji: '🍔', name: 'Hamburger', category: 'food' },
      { emoji: '🍟', name: 'French Fries', category: 'food' },
    ],
    activities: [
      { emoji: '⚽', name: 'Soccer Ball', category: 'activities' },
      { emoji: '🏀', name: 'Basketball', category: 'activities' },
      { emoji: '🏈', name: 'American Football', category: 'activities' },
      { emoji: '⚾', name: 'Baseball', category: 'activities' },
      { emoji: '🎾', name: 'Tennis', category: 'activities' },
      { emoji: '🎱', name: 'Pool 8 Ball', category: 'activities' },
      { emoji: '🎮', name: 'Video Game', category: 'activities' },
      { emoji: '🎲', name: 'Game Die', category: 'activities' },
      { emoji: '♟️', name: 'Chess Pawn', category: 'activities' },
      { emoji: '🎯', name: 'Direct Hit', category: 'activities' },
    ],
    objects: [
      { emoji: '📱', name: 'Mobile Phone', category: 'objects' },
      { emoji: '💻', name: 'Laptop', category: 'objects' },
      { emoji: '⌨️', name: 'Keyboard', category: 'objects' },
      { emoji: '🖥️', name: 'Desktop Computer', category: 'objects' },
      { emoji: '🖨️', name: 'Printer', category: 'objects' },
      { emoji: '🖱️', name: 'Computer Mouse', category: 'objects' },
      { emoji: '🕹️', name: 'Joystick', category: 'objects' },
      { emoji: '⌚', name: 'Watch', category: 'objects' },
      { emoji: '📷', name: 'Camera', category: 'objects' },
      { emoji: '💡', name: 'Light Bulb', category: 'objects' },
    ],
    symbols: [
      { emoji: '❤️', name: 'Red Heart', category: 'symbols' },
      { emoji: '🧡', name: 'Orange Heart', category: 'symbols' },
      { emoji: '💛', name: 'Yellow Heart', category: 'symbols' },
      { emoji: '💚', name: 'Green Heart', category: 'symbols' },
      { emoji: '💙', name: 'Blue Heart', category: 'symbols' },
      { emoji: '💜', name: 'Purple Heart', category: 'symbols' },
      { emoji: '🖤', name: 'Black Heart', category: 'symbols' },
      { emoji: '🤍', name: 'White Heart', category: 'symbols' },
      { emoji: '💔', name: 'Broken Heart', category: 'symbols' },
      { emoji: '💕', name: 'Two Hearts', category: 'symbols' },
    ],
  }), []);

  // Get filtered emojis
  const filteredEmojis = useMemo(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const results: Emoji[] = [];
      
      for (const catEmojis of Object.values(allEmojis)) {
        for (const emoji of catEmojis) {
          if (emoji.name.toLowerCase().includes(query) || emoji.emoji.includes(query)) {
            results.push(emoji);
          }
        }
      }
      
      return results.slice(0, 50);
    }
    
    if (selectedCategory === 'recent') {
      return recentEmojis.map(emoji => {
        for (const catEmojis of Object.values(allEmojis)) {
          const found = catEmojis.find(e => e.emoji === emoji);
          if (found) return found;
        }
        return { emoji, name: '', category: 'recent' };
      }).filter(Boolean);
    }
    
    return allEmojis[selectedCategory] || [];
  }, [allEmojis, selectedCategory, searchQuery, recentEmojis]);

  // Get categories with emojis
  const categoryList = useMemo(() => {
    if (showRecent && recentEmojis.length > 0) {
      return [
        { name: 'recent', emojis: recentEmojis, custom: true },
        ...categories.filter(c => c !== 'recent').map(c => ({
          name: c,
          emojis: allEmojis[c] || [],
        })),
      ];
    }
    
    return categories.map(c => ({
      name: c,
      emojis: allEmojis[c] || [],
    }));
  }, [categories, allEmojis, recentEmojis, showRecent]);

  // Select emoji
  const selectEmoji = useCallback((emoji: string) => {
    // Add to recent
    setRecentEmojis(prev => {
      const filtered = prev.filter(e => e !== emoji);
      return [emoji, ...filtered].slice(0, maxRecent);
    });
    
    onSelect?.(emoji);
  }, [maxRecent, onSelect]);

  // Open picker
  const open = useCallback(() => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // Close picker
  const close = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, []);

  // Toggle picker
  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  // Clear recent
  const clearRecent = useCallback(() => {
    setRecentEmojis([]);
  }, []);

  return {
    isOpen,
    selectedCategory,
    searchQuery,
    recentEmojis,
    filteredEmojis,
    categoryList,
    isLoading,
    setSelectedCategory,
    setSearchQuery,
    selectEmoji,
    open,
    close,
    toggle,
    clearRecent,
  };
}
