'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

export interface RoomDirectoryItem {
  id: string;
  name: string;
  hostUsername: string;
  participantCount: number;
  maxParticipants: number;
  isPrivate: boolean;
  animeTitle?: string;
  animeCover?: string;
  currentEpisode?: string;
  tags: string[];
  createdAt: number;
  activity: 'active' | 'idle' | 'ending';
  viewerCount: number;
}

export interface RoomDirectoryFilters {
  query?: string;
  tags?: string[];
  activity?: 'all' | 'active' | 'idle';
  maxParticipants?: number;
  sortBy?: 'activity' | 'participants' | 'alphabetical';
}

export function useRoomDirectory() {
  const [rooms, setRooms] = useState<RoomDirectoryItem[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<RoomDirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RoomDirectoryFilters>({
    sortBy: 'activity',
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch rooms from directory
  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<{ rooms: RoomDirectoryItem[] }>('/api/rooms/directory?refresh=' + refreshTrigger);

      setRooms(response.rooms);
      applyFilters();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch rooms';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [refreshTrigger]);

  // Apply filters to rooms
  const applyFilters = useCallback(() => {
    let result = [...rooms];

    // Search query filter
    if (filters.query) {
      const query = filters.query.toLowerCase();
      result = result.filter(room =>
        room.name.toLowerCase().includes(query) ||
        room.animeTitle?.toLowerCase().includes(query) ||
        room.hostUsername.toLowerCase().includes(query)
      );
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      result = result.filter(room =>
        filters.tags!.some(tag => room.tags.includes(tag))
      );
    }

    // Activity filter
    if (filters.activity && filters.activity !== 'all') {
      result = result.filter(room => room.activity === filters.activity);
    }

    // Max participants filter
    if (filters.maxParticipants) {
      result = result.filter(room => room.maxParticipants <= filters.maxParticipants!);
    }

    // Sort
    switch (filters.sortBy) {
      case 'activity':
        result.sort((a, b) => {
          const order = { active: 0, idle: 1, ending: 2 };
          return (order[a.activity] || 0) - (order[b.activity] || 0);
        });
        break;
      case 'participants':
        result.sort((a, b) => b.participantCount - a.participantCount);
        break;
      case 'alphabetical':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    setFilteredRooms(result);
  }, [rooms, filters]);

  // Watch for filter changes
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Refresh rooms
  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<RoomDirectoryFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      sortBy: 'activity',
    });
  }, []);

  // Get room by ID
  const getRoom = useCallback((roomId: string): RoomDirectoryItem | undefined => {
    return rooms.find(room => room.id === roomId);
  }, [rooms]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRooms();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchRooms]);

  // Initial fetch
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  return {
    rooms,
    filteredRooms,
    isLoading,
    error,
    filters,
    fetchRooms,
    refresh,
    updateFilters,
    clearFilters,
    getRoom,
  };
}
