'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface FavoriteItem {
  id: string;
  type: 'room' | 'anime' | 'user' | 'clip';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  url?: string;
  metadata?: Record<string, unknown>;
  addedAt: number;
  lastAccessedAt: number;
  accessCount: number;
}

export interface UseFavoritesManagerOptions {
  maxFavorites?: number;
  onFavoriteAdd?: (item: FavoriteItem) => void;
  onFavoriteRemove?: (itemId: string) => void;
  onFavoriteUpdate?: (item: FavoriteItem) => void;
}

export function useFavoritesManager(options: UseFavoritesManagerOptions = {}) {
  const { maxFavorites = 100, onFavoriteAdd, onFavoriteRemove, onFavoriteUpdate } = options;
  
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const favoritesRef = useRef(favorites);
  const maxRef = useRef(maxFavorites);
  
  favoritesRef.current = favorites;
  maxRef.current = maxFavorites;

  // Add to favorites
  const add = useCallback((item: Omit<FavoriteItem, 'addedAt' | 'lastAccessedAt' | 'accessCount'>): FavoriteItem | null => {
    if (favoritesRef.current.length >= maxRef.current) {
      setError(`Maximum ${maxRef.current} favorites allowed`);
      return null;
    }

    const existing = favoritesRef.current.find(f => f.id === item.id && f.type === item.type);
    if (existing) {
      setError('Already in favorites');
      return null;
    }

    const newItem: FavoriteItem = {
      ...item,
      addedAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
    };

    setFavorites(prev => [newItem, ...prev]);
    onFavoriteAdd?.(newItem);
    
    return newItem;
  }, [maxRef, onFavoriteAdd]);

  // Remove from favorites
  const remove = useCallback((itemId: string): boolean => {
    const initialLength = favoritesRef.current.length;
    setFavorites(prev => prev.filter(f => f.id !== itemId));
    
    if (favoritesRef.current.length > initialLength) {
      onFavoriteRemove?.(itemId);
      return true;
    }
    return false;
  }, [onFavoriteRemove]);

  // Toggle favorite
  const toggle = useCallback((item: Omit<FavoriteItem, 'addedAt' | 'lastAccessedAt' | 'accessCount'>): FavoriteItem | null => {
    const existing = favoritesRef.current.find(f => f.id === item.id && f.type === item.type);
    if (existing) {
      remove(item.id);
      return null;
    }
    return add(item);
  }, [add, remove]);

  // Get favorite by ID
  const get = useCallback((itemId: string): FavoriteItem | undefined => {
    return favoritesRef.current.find(f => f.id === itemId);
  }, []);

  // Get favorites by type
  const getByType = useCallback((type: FavoriteItem['type']): FavoriteItem[] => {
    return favoritesRef.current.filter(f => f.type === type);
  }, []);

  // Update favorite
  const update = useCallback((itemId: string, updates: Partial<FavoriteItem>): FavoriteItem | null => {
    setFavorites(prev => {
      const index = prev.findIndex(f => f.id === itemId);
      if (index === -1) return prev;
      
      const updated: FavoriteItem = {
        ...prev[index],
        ...updates,
        lastAccessedAt: Date.now(),
      };
      
      const newFavorites = [...prev];
      newFavorites[index] = updated;
      return newFavorites;
    });
    
    const item = favoritesRef.current.find(f => f.id === itemId);
    if (item) {
      const updated = { ...item, ...updates, lastAccessedAt: Date.now() };
      setFavorites(prev => prev.map(f => f.id === itemId ? updated : f));
      onFavoriteUpdate?.(updated);
      return updated;
    }
    return null;
  }, [onFavoriteUpdate]);

  // Access favorite (increment count)
  const access = useCallback((itemId: string) => {
    setFavorites(prev => prev.map(f => 
      f.id === itemId 
        ? { ...f, lastAccessedAt: Date.now(), accessCount: f.accessCount + 1 }
        : f
    ));
  }, []);

  // Search favorites
  const search = useCallback((query: string): FavoriteItem[] => {
    if (!query.trim()) return favoritesRef.current;
    
    const lowerQuery = query.toLowerCase();
    return favoritesRef.current.filter(f => 
      f.title.toLowerCase().includes(lowerQuery) ||
      f.subtitle?.toLowerCase().includes(lowerQuery)
    );
  }, []);

  // Get recently accessed
  const getRecent = useCallback((limit: number = 10): FavoriteItem[] => {
    return [...favoritesRef.current]
      .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)
      .slice(0, limit);
  }, []);

  // Get most accessed
  const getMostAccessed = useCallback((limit: number = 10): FavoriteItem[] => {
    return [...favoritesRef.current]
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }, []);

  // Get oldest favorites
  const getOldest = useCallback((limit: number = 10): FavoriteItem[] => {
    return [...favoritesRef.current]
      .sort((a, b) => a.addedAt - b.addedAt)
      .slice(0, limit);
  }, []);

  // Get favorites count
  const getCount = useCallback((): number => {
    return favoritesRef.current.length;
  }, []);

  // Check if favorite
  const isFavorite = useCallback((itemId: string, type: FavoriteItem['type']): boolean => {
    return favoritesRef.current.some(f => f.id === itemId && f.type === type);
  }, []);

  // Clear all favorites
  const clear = useCallback(() => {
    setFavorites([]);
  }, []);

  // Get favorites summary
  const getSummary = useCallback((): Record<string, number> => {
    const summary: Record<string, number> = {
      rooms: 0,
      anime: 0,
      users: 0,
      clips: 0,
    };
    
    favoritesRef.current.forEach(f => {
      if (summary[f.type] !== undefined) {
        summary[f.type]++;
      }
    });
    
    return summary;
  }, []);

  // Reset to defaults
  const reset = useCallback(() => {
    setFavorites([]);
    setSearchQuery('');
    setError(null);
  }, []);

  return {
    favorites,
    isAdding,
    error,
    searchQuery,
    add,
    remove,
    toggle,
    get,
    getByType,
    update,
    access,
    search,
    getRecent,
    getMostAccessed,
    getOldest,
    getCount,
    isFavorite,
    clear,
    getSummary,
    reset,
  };
}
