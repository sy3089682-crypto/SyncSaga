'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

// Simple date utilities
const formatDateString = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const isAfterDate = (date1: number, date2: number): boolean => date1 > date2;
const isBeforeDate = (date1: number, date2: number): boolean => date1 < date2;

export interface ScheduledEvent {
  id: string;
  roomId: string;
  title: string;
  description?: string;
  animeTitle?: string;
  animeCover?: string;
  episode?: number;
  scheduledAt: number;
  duration?: number;
  hostId: string;
  hostUsername: string;
  participantIds: string[];
  maxParticipants?: number;
  isPrivate: boolean;
  inviteCode?: string;
  recurring?: {
    type: 'daily' | 'weekly' | 'custom';
    daysOfWeek?: number[];
    time?: string;
  };
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  createdAt: number;
  updatedAt: number;
}

export interface ScheduleFilters {
  upcoming?: boolean;
  live?: boolean;
  past?: boolean;
  mine?: boolean;
  tags?: string[];
  animeTitle?: string;
  startDate?: number;
  endDate?: number;
}

export function useWatchSchedule(userId?: string) {
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<ScheduledEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ScheduleFilters>({});
  
  const socketRef = useRef<any>(null);
  const eventCountRef = useRef(0);

  // Initialize socket for schedule updates
  useEffect(() => {
    const initSocket = async () => {
      try {
        const socket = await getSocket();
        socketRef.current = socket;
        
        socket.on('schedule:update', (event: ScheduledEvent) => {
          setEvents(prev => {
            const existing = prev.find(e => e.id === event.id);
            if (existing) {
              return prev.map(e => e.id === event.id ? event : e);
            }
            return [...prev, event];
          });
          eventCountRef.current += 1;
        });
        
        socket.on('schedule:delete', ({ eventId }: { eventId: string }) => {
          setEvents(prev => prev.filter(e => e.id !== eventId));
        });
        
        socket.on('schedule:status', ({ eventId, status }: { eventId: string; status: ScheduledEvent['status'] }) => {
          setEvents(prev => prev.map(e => 
            e.id === eventId ? { ...e, status } : e
          ));
        });
        
      } catch (err) {
        console.error('Failed to initialize schedule socket:', err);
      }
    };
    
    initSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off('schedule:update');
        socketRef.current.off('schedule:delete');
        socketRef.current.off('schedule:status');
      }
    };
  }, []);

  // Fetch schedule events
  const fetchEvents = useCallback(async (newFilters?: ScheduleFilters) => {
    if (newFilters) {
      setFilters(newFilters);
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = new URL('/api/schedule', typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
      if (filters.upcoming !== undefined) url.searchParams.set('upcoming', String(filters.upcoming));
      if (filters.live !== undefined) url.searchParams.set('live', String(filters.live));
      if (filters.past !== undefined) url.searchParams.set('past', String(filters.past));
      if (filters.mine) url.searchParams.set('mine', 'true');
      if (filters.animeTitle) url.searchParams.set('animeTitle', filters.animeTitle);
      if (filters.startDate) url.searchParams.set('startDate', String(filters.startDate));
      if (filters.endDate) url.searchParams.set('endDate', String(filters.endDate));
      
      const response = await api.get<{ events: ScheduledEvent[] }>(url.pathname + url.search);

      setEvents(response.events);
      applyFilters();
      return response.events;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch schedule';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Apply filters to events
  const applyFilters = useCallback(() => {
    let result = [...events];

    if (filters.mine && userId) {
      result = result.filter(e => e.hostId === userId);
    }

    if (filters.upcoming !== undefined) {
      const now = Date.now();
      result = result.filter(e => 
        filters.upcoming ? isAfterDate(e.scheduledAt, now) : !isAfterDate(e.scheduledAt, now)
      );
    }

    if (filters.live !== undefined) {
      const now = Date.now();
      result = result.filter(e => {
        const endTime = e.scheduledAt + (e.duration || 60) * 60 * 1000;
        const isLive = e.status === 'live' || (e.scheduledAt <= now && isAfterDate(endTime, now));
        return filters.live ? isLive : !isLive;
      });
    }

    if (filters.past !== undefined) {
      const now = Date.now();
      result = result.filter(e => {
        const endTime = e.scheduledAt + (e.duration || 60) * 60 * 1000;
        return filters.past ? isBeforeDate(endTime, now) : !isBeforeDate(endTime, now);
      });
    }

    if (filters.animeTitle) {
      const title = filters.animeTitle.toLowerCase();
      result = result.filter(e => e.animeTitle?.toLowerCase().includes(title));
    }

    if (filters.startDate) {
      result = result.filter(e => e.scheduledAt >= filters.startDate!);
    }
    if (filters.endDate) {
      result = result.filter(e => e.scheduledAt <= filters.endDate!);
    }

    result.sort((a, b) => a.scheduledAt - b.scheduledAt);
    setFilteredEvents(result);
  }, [events, filters, userId]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const createEvent = useCallback(async (
    data: Omit<ScheduledEvent, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'participantIds'>
  ): Promise<ScheduledEvent | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post<{ event: ScheduledEvent }>('/api/schedule', data);
      const newEvent = response.event;
      setEvents(prev => [newEvent, ...prev]);
      eventCountRef.current += 1;

      if (socketRef.current) {
        socketRef.current.emit('schedule:create', { event: newEvent });
      }

      return newEvent;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create event';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const joinEvent = useCallback(async (eventId: string): Promise<boolean> => {
    if (!userId) {
      setError('Must be logged in');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.post('/api/schedule/join', { eventId });

      setEvents(prev => prev.map(e => 
        e.id === eventId 
          ? { ...e, participantIds: [...e.participantIds, userId] }
          : e
      ));

      if (socketRef.current) {
        socketRef.current.emit('schedule:join', { eventId, userId });
      }

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join event';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const leaveEvent = useCallback(async (eventId: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      await api.post('/api/schedule/leave', { eventId });

      setEvents(prev => prev.map(e => 
        e.id === eventId 
          ? { ...e, participantIds: e.participantIds.filter(id => id !== userId) }
          : e
      ));

      if (socketRef.current) {
        socketRef.current.emit('schedule:leave', { eventId, userId });
      }

      return true;
    } catch (err) {
      console.error('Failed to leave event:', err);
      return false;
    }
  }, [userId]);

  const cancelEvent = useCallback(async (eventId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await api.post('/api/schedule/cancel', { eventId });

      setEvents(prev => prev.map(e => 
        e.id === eventId ? { ...e, status: 'cancelled' as const } : e
      ));

      if (socketRef.current) {
        socketRef.current.emit('schedule:cancel', { eventId });
      }

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel event';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getEvent = useCallback((eventId: string): ScheduledEvent | undefined => {
    return events.find(e => e.id === eventId);
  }, [events]);

  const isEventLive = useCallback((event: ScheduledEvent): boolean => {
    const now = Date.now();
    const startTime = event.scheduledAt;
    const endTime = startTime + (event.duration || 60) * 60 * 1000;
    return now >= startTime && now <= endTime && event.status !== 'ended' && event.status !== 'cancelled';
  }, []);

  const getTimeUntil = useCallback((event: ScheduledEvent): string => {
    const now = Date.now();
    const diff = event.scheduledAt - now;

    if (diff < 0) {
      const elapsed = Math.abs(diff);
      if (elapsed < 60000) return 'Started';
      if (elapsed < 3600000) return `${Math.floor(elapsed / 60000)}m ago`;
      return `${Math.floor(elapsed / 3600000)}h ago`;
    }

    if (diff < 3600000) return `In ${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `In ${Math.floor(diff / 3600000)}h`;
    return `In ${Math.floor(diff / 86400000)}d`;
  }, []);

  const formatEventDate = useCallback((event: ScheduledEvent): string => {
    return formatDateString(new Date(event.scheduledAt));
  }, []);

  const getTodaysEvents = useCallback((): ScheduledEvent[] => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    return filteredEvents.filter(e => {
      const eventDate = new Date(e.scheduledAt);
      return eventDate >= todayStart && eventDate < tomorrowStart;
    });
  }, [filteredEvents]);

  const getUpcomingEvents = useCallback((limit = 5): ScheduledEvent[] => {
    const now = Date.now();
    return filteredEvents
      .filter(e => e.scheduledAt > now && e.status === 'scheduled')
      .slice(0, limit);
  }, [filteredEvents]);

  const getLiveNowEvents = useCallback((): ScheduledEvent[] => {
    return filteredEvents.filter(e => isEventLive(e));
  }, [filteredEvents, isEventLive]);

  useEffect(() => {
    const interval = setInterval(() => {
      applyFilters();
    }, 60000);

    return () => clearInterval(interval);
  }, [applyFilters]);

  return {
    events,
    filteredEvents,
    isLoading,
    error,
    filters,
    fetchEvents,
    createEvent,
    joinEvent,
    leaveEvent,
    cancelEvent,
    getEvent,
    isEventLive,
    getTimeUntil,
    formatEventDate,
    getTodaysEvents,
    getUpcomingEvents,
    getLiveNowEvents,
  };
}
