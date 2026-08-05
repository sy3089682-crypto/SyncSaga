'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export type SessionStatus = 'active' | 'paused' | 'ended' | 'timeout';

export interface SessionInfo {
  id: string;
  userId: string;
  startedAt: number;
  lastActivity: number;
  status: SessionStatus;
  devices: {
    type: 'desktop' | 'mobile' | 'tablet';
    browser: string;
    os: string;
    lastActive: number;
  }[];
  activeRoomId?: string;
  resumeToken?: string;
}

export interface UseSessionManagerOptions {
  userId?: string;
  sessionTimeout?: number; // minutes
  onTimeout?: () => void;
  onPause?: () => void;
  onResume?: () => void;
}

export function useSessionManager(options: UseSessionManagerOptions = {}) {
  const { userId, sessionTimeout = 30, onTimeout, onPause, onResume } = options;
  
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [status, setStatus] = useState<SessionStatus>('active');
  const [isPaused, setIsPaused] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  
  const sessionRef = useRef<SessionInfo | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activityRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Generate session ID
  const generateSessionId = useCallback((): string => {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }, []);

  // Get device info
  const getDeviceInfo = useCallback((): SessionInfo['devices'][0] => {
    const ua = navigator.userAgent;
    let type: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (/Mobile|iPhone|iPad|iPod/i.test(ua)) {
      type = /iPad/i.test(ua) ? 'tablet' : 'mobile';
    }
    
    let browser = 'Unknown';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    
    let os = 'Unknown';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('iPhone')) os = 'iOS';
    else if (ua.includes('Android')) os = 'Android';
    
    return { type, browser, os, lastActive: Date.now() };
  }, []);

  // Start session
  const startSession = useCallback(() => {
    const sessionInfo: SessionInfo = {
      id: generateSessionId(),
      userId: userId || 'anonymous',
      startedAt: Date.now(),
      lastActivity: Date.now(),
      status: 'active',
      devices: [getDeviceInfo()],
    };
    
    sessionRef.current = sessionInfo;
    setSession(sessionInfo);
    setStatus('active');
    setIsPaused(false);
    startTimeRef.current = Date.now();
    
    // Start inactivity timer
    startInactivityTimer();
    
    return sessionInfo;
  }, [userId]);

  // End session
  const endSession = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (activityRef.current) {
      clearTimeout(activityRef.current);
    }
    
    setSession(prev => prev ? { ...prev, status: 'ended' } : null);
    setStatus('ended');
    setIsPaused(false);
    setRemainingTime(null);
    
    onTimeout?.();
  }, [onTimeout]);

  // Pause session
  const pauseSession = useCallback(() => {
    setIsPaused(true);
    setStatus('paused');
    onPause?.();
  }, [onPause]);

  // Resume session
  const resumeSession = useCallback(() => {
    setIsPaused(false);
    setStatus('active');
    startTimeRef.current = Date.now();
    onResume?.();
    startInactivityTimer();
  }, [onResume]);

  // Track activity
  const trackActivity = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.lastActivity = Date.now();
    }
    
    // Reset inactivity timer
    if (activityRef.current) {
      clearTimeout(activityRef.current);
    }
    
    activityRef.current = setTimeout(() => {
      // Check if user is inactive
      const inactiveTime = Date.now() - (sessionRef.current?.lastActivity || Date.now());
      const timeoutMs = sessionTimeout * 60 * 1000;
      
      if (inactiveTime >= timeoutMs) {
        endSession();
      } else {
        // Update remaining time
        setRemainingTime(Math.ceil((timeoutMs - inactiveTime) / 1000));
      }
    }, 1000);
  }, [sessionTimeout, endSession]);

  // Start inactivity timer
  const startInactivityTimer = useCallback(() => {
    if (activityRef.current) {
      clearTimeout(activityRef.current);
    }
    
    // Set initial remaining time
    const timeoutMs = sessionTimeout * 60 * 1000;
    setRemainingTime(Math.ceil(timeoutMs / 1000));
    
    // Start activity tracking
    trackActivity();
  }, [sessionTimeout, trackActivity]);

  // Extend session
  const extendSession = useCallback((additionalMinutes?: number) => {
    // In real implementation, this would extend the session server-side
    // For now, just reset the inactivity timer
    startInactivityTimer();
  }, [startInactivityTimer]);

  // Get session duration
  const getSessionDuration = useCallback((): number => {
    if (!sessionRef.current) return 0;
    return Date.now() - sessionRef.current.startedAt;
  }, []);

  // Get formatted duration
  const getFormattedDuration = useCallback((): string => {
    const duration = getSessionDuration();
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, [getSessionDuration]);

  // Check if session is expiring soon
  const isExpiringSoon = useCallback((): boolean => {
    if (remainingTime === null) return false;
    return remainingTime < 60; // Less than 1 minute
  }, [remainingTime]);

  // Get warning level
  const getWarningLevel = useCallback((): 'none' | 'warning' | 'critical' => {
    if (remainingTime === null) return 'none';
    if (remainingTime < 30) return 'critical';
    if (remainingTime < 120) return 'warning';
    return 'none';
  }, [remainingTime]);

  // Auto-pause on tab hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseSession();
      } else {
        resumeSession();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pauseSession, resumeSession]);

  // Activity tracking
  useEffect(() => {
    const handleActivity = () => {
      trackActivity();
    };
    
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [trackActivity]);

  // Auto-start session
  useEffect(() => {
    startSession();
    
    return () => {
      endSession();
    };
  }, [startSession, endSession]);

  return {
    session,
    status,
    isPaused,
    remainingTime,
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    trackActivity,
    extendSession,
    getSessionDuration,
    getFormattedDuration,
    isExpiringSoon,
    getWarningLevel,
  };
}
