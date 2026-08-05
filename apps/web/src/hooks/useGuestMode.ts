'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

interface GuestUser {
  id: string;
  username: string;
  isGuest: boolean;
  avatarUrl?: string;
}

interface GuestJoinData {
  roomId: string;
  guestCode: string;
  username: string;
}

export function useGuestMode() {
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate a random guest username
  const generateGuestUsername = useCallback((): string => {
    const adjectives = ['Swift', 'Brave', 'Silent', 'Happy', 'Cosmic', 'Lunar', 'Solar', 'Neon', 'Pixel', 'Quantum'];
    const nouns = ['Viewer', 'Watcher', 'Fan', 'Explorer', 'Traveler', 'Legend', 'Hero', 'Friend'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const num = Math.floor(Math.random() * 1000);
    return `${adj}${num}`;
  }, []);

  // Join room as guest
  const joinAsGuest = useCallback(async (data: { roomId: string; username?: string }) => {
    setIsJoining(true);
    setError(null);

    try {
      // For guest mode, we create a temporary session
      const username = data.username || generateGuestUsername();
      
      // Create guest session
      const response = await api.post<{ guest: GuestUser; token: string }>('/api/guest/join', {
        roomId: data.roomId,
        username,
      });

      const guest: GuestUser = {
        id: response.guest.id,
        username: response.guest.username,
        isGuest: true,
        avatarUrl: response.guest.avatarUrl,
      };

      setGuestUser(guest);
      setIsGuestMode(true);

      return { guest, token: response.token };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join as guest';
      setError(errorMessage);
      throw err;
    } finally {
      setIsJoining(false);
    }
  }, [generateGuestUsername]);

  // Upgrade guest to registered user
  const upgradeToUser = useCallback(async (authData: { email: string; password: string }) => {
    if (!guestUser) {
      throw new Error('No guest session to upgrade');
    }

    setIsJoining(true);
    setError(null);

    try {
      // Register or login with the provided credentials
      const response = await api.post<{ user: any; token: string }>('/api/auth/register', {
        email: authData.email,
        password: authData.password,
        username: guestUser.username,
      });

      // Copy over guest state to user
      setGuestUser(null);
      setIsGuestMode(false);

      return response;
    } catch (err) {
      // If registration fails, we might want to keep guest mode
      console.error('Upgrade failed:', err);
      throw err;
    } finally {
      setIsJoining(false);
    }
  }, [guestUser]);

  // Leave guest mode
  const leaveGuestMode = useCallback(() => {
    setGuestUser(null);
    setIsGuestMode(false);
    setError(null);
  }, []);

  // Check if user can perform host actions (only logged-in users can host)
  const canHost = useCallback(() => {
    return !isGuestMode;
  }, [isGuestMode]);

  return {
    isGuestMode,
    guestUser,
    isJoining,
    error,
    joinAsGuest,
    upgradeToUser,
    leaveGuestMode,
    canHost,
    generateGuestUsername,
  };
}
