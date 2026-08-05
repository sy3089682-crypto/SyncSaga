'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface RoomInfo {
  id: string;
  name: string;
  description?: string;
  hostId: string;
  hostUsername: string;
  participantCount: number;
  maxParticipants: number;
  isPrivate: boolean;
  isPublic: boolean;
  tags: string[];
  animeTitle?: string;
  animeCover?: string;
  currentEpisode?: string;
  createdAt: number;
  lastActivity: number;
  status: 'active' | 'idle' | 'ending' | 'full';
  viewerCount: number;
  avgLatency: number;
  syncQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface UseRoomsManagerOptions {
  maxHistory?: number;
  onRoomJoin?: (room: RoomInfo) => void;
  onRoomLeave?: (roomId: string) => void;
  onRoomCreate?: (room: RoomInfo) => void;
}

export function useRoomsManager(options: UseRoomsManagerOptions = {}) {
  const { maxHistory = 50, onRoomJoin, onRoomLeave, onRoomCreate } = options;
  
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [joinedRooms, setJoinedRooms] = useState<Set<string>>(new Set());
  const [hostedRooms, setHostedRooms] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{
    status?: RoomInfo['status'];
    tags?: string[];
    maxParticipants?: number;
    sortBy?: 'activity' | 'participants' | 'alphabetical';
  }>({});
  
  const roomsRef = useRef(rooms);
  const joinedRef = useRef(joinedRooms);
  const hostedRef = useRef(hostedRooms);
  
  roomsRef.current = rooms;
  joinedRef.current = joinedRooms;
  hostedRef.current = hostedRooms;

  // Fetch rooms
  const fetchRooms = useCallback(async (): Promise<RoomInfo[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In real implementation, fetch from API
      // const response = await api.get('/api/rooms/directory');
      // setRooms(response.rooms);
      
      setRooms(prev => prev); // Placeholder
      return rooms;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch rooms';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Join room
  const joinRoom = useCallback(async (roomId: string): Promise<RoomInfo | null> => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) {
      setError('Room not found');
      return null;
    }
    
    if (joinedRef.current.has(roomId)) {
      setError('Already in this room');
      return null;
    }
    
    if (room.participantCount >= room.maxParticipants) {
      setError('Room is full');
      return null;
    }
    
    try {
      setJoinedRooms(prev => new Set([...prev, roomId]));
      setRooms(prev => prev.map(r => 
        r.id === roomId 
          ? { ...r, participantCount: r.participantCount + 1, status: r.participantCount + 1 >= r.maxParticipants ? 'full' : r.status }
          : r
      ));
      
      onRoomJoin?.(room);
      
      return room;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join room';
      setError(errorMessage);
      return null;
    }
  }, [rooms, onRoomJoin]);

  // Leave room
  const leaveRoom = useCallback(async (roomId: string): Promise<boolean> => {
    if (!joinedRef.current.has(roomId)) {
      return false;
    }
    
    try {
      setJoinedRooms(prev => {
        const newSet = new Set(prev);
        newSet.delete(roomId);
        return newSet;
      });
      
      setRooms(prev => prev.map(r => 
        r.id === roomId 
          ? { ...r, participantCount: Math.max(0, r.participantCount - 1) }
          : r
      ));
      
      onRoomLeave?.(roomId);
      
      return true;
    } catch (err) {
      setError('Failed to leave room');
      return false;
    }
  }, [onRoomLeave]);

  // Create room
  const createRoom = useCallback(async (data: Omit<RoomInfo, 'id' | 'createdAt' | 'lastActivity' | 'status' | 'viewerCount' | 'avgLatency' | 'syncQuality'>): Promise<RoomInfo | null> => {
    try {
      const room: RoomInfo = {
        ...data,
        id: `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        status: 'active',
        viewerCount: data.participantCount,
        avgLatency: 0,
        syncQuality: 'excellent',
      };
      
      setRooms(prev => [room, ...prev].slice(0, maxHistory));
      setHostedRooms(prev => new Set([...prev, room.id]));
      
      onRoomCreate?.(room);
      
      return room;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create room';
      setError(errorMessage);
      return null;
    }
  }, [maxHistory, onRoomCreate]);

  // Delete room (host only)
  const deleteRoom = useCallback(async (roomId: string): Promise<boolean> => {
    if (!hostedRef.current.has(roomId)) {
      setError('Only the host can delete the room');
      return false;
    }
    
    try {
      setRooms(prev => prev.filter(r => r.id !== roomId));
      setHostedRooms(prev => {
        const newSet = new Set(prev);
        newSet.delete(roomId);
        return newSet;
      });
      
      return true;
    } catch (err) {
      setError('Failed to delete room');
      return false;
    }
  }, []);

  // Get room by ID
  const getRoom = useCallback((roomId: string): RoomInfo | undefined => {
    return rooms.find(r => r.id === roomId);
  }, [rooms]);

  // Get rooms by status
  const getByStatus = useCallback((status: RoomInfo['status']): RoomInfo[] => {
    return rooms.filter(r => r.status === status);
  }, [rooms]);

  // Get rooms by tag
  const getByTag = useCallback((tag: string): RoomInfo[] => {
    return rooms.filter(r => r.tags.includes(tag));
  }, [rooms]);

  // Search rooms
  const search = useCallback((query: string): RoomInfo[] => {
    if (!query.trim()) return rooms;
    
    const lowerQuery = query.toLowerCase();
    return rooms.filter(r => 
      r.name.toLowerCase().includes(lowerQuery) ||
      r.animeTitle?.toLowerCase().includes(lowerQuery) ||
      r.hostUsername.toLowerCase().includes(lowerQuery) ||
      r.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );
  }, [rooms]);

  // Filter rooms
  const filterRooms = useCallback((): RoomInfo[] => {
    let result = [...rooms];
    
    if (filters.status) {
      result = result.filter(r => r.status === filters.status);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      result = result.filter(r => filters.tags!.some(t => r.tags.includes(t)));
    }
    
    if (filters.maxParticipants) {
      result = result.filter(r => r.maxParticipants <= filters.maxParticipants!);
    }
    
    switch (filters.sortBy) {
      case 'activity':
        result.sort((a, b) => b.lastActivity - a.lastActivity);
        break;
      case 'participants':
        result.sort((a, b) => b.participantCount - a.participantCount);
        break;
      case 'alphabetical':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    
    return result;
  }, [rooms, filters]);

  // Get room stats
  const getStats = useCallback((): Record<string, number> => {
    return {
      total: rooms.length,
      active: rooms.filter(r => r.status === 'active').length,
      idle: rooms.filter(r => r.status === 'idle').length,
      ending: rooms.filter(r => r.status === 'ending').length,
      full: rooms.filter(r => r.status === 'full').length,
      public: rooms.filter(r => r.isPublic).length,
      private: rooms.filter(r => r.isPrivate).length,
      joined: joinedRef.current.size,
      hosted: hostedRef.current.size,
    };
  }, [rooms]);

  // Check if joined
  const isJoined = useCallback((roomId: string): boolean => {
    return joinedRef.current.has(roomId);
  }, []);

  // Check if hosted
  const isHosted = useCallback((roomId: string): boolean => {
    return hostedRef.current.has(roomId);
  }, []);

  // Clear all
  const clear = useCallback(() => {
    setRooms([]);
    setJoinedRooms(new Set());
    setHostedRooms(new Set());
    setSearchQuery('');
    setFilters({});
    setError(null);
  }, []);

  return {
    rooms,
    joinedRooms: [...joinedRooms],
    hostedRooms: [...hostedRooms],
    isLoading,
    error,
    searchQuery,
    filters,
    fetchRooms,
    joinRoom,
    leaveRoom,
    createRoom,
    deleteRoom,
    getRoom,
    getByStatus,
    getByTag,
    search,
    filterRooms,
    getStats,
    isJoined,
    isHosted,
    clear,
  };
}
