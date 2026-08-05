'use client';

import { useEffect, useRef, useCallback } from 'react';

interface WakeLockConfig {
  enableOnHost?: boolean;
  enableOnMobile?: boolean;
  autoReleaseTimeout?: number;
}

export function useWakeLock(config: WakeLockConfig = {}) {
  const wakelockRef = useRef<WakeLockSentinel | null>(null);
  const enableOnHost = config.enableOnHost ?? true;
  const enableOnMobile = config.enableOnMobile ?? true;
  const autoReleaseTimeout = config.autoReleaseTimeout ?? 300000;
  const activityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isHostRef = useRef(false);

  const isMobile = useCallback(() => {
    if (!enableOnMobile) return false;
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, [enableOnMobile]);

  const setHostStatus = useCallback((isHost: boolean) => {
    isHostRef.current = isHost;
  }, []);

  const isHost = useCallback(() => {
    if (!enableOnHost) return true;
    return isHostRef.current;
  }, [enableOnHost]);

  const acquire = useCallback(async () => {
    if (!('wakeLock' in navigator)) {
      return false;
    }
    
    if (!isMobile() || !isHost()) {
      return false;
    }
    
    try {
      // Release existing lock first
      if (wakelockRef.current) {
        await wakelockRef.current.release();
      }
      
      wakelockRef.current = await navigator.wakeLock.request('screen');
      
      wakelockRef.current.addEventListener('release', () => {
        console.log('Screen wake lock released');
      });
      
      return true;
    } catch (err) {
      console.error('Failed to acquire wake lock:', err);
      return false;
    }
  }, [isMobile, isHost]);

  const release = useCallback(() => {
    if (wakelockRef.current) {
      try {
        wakelockRef.current.release();
      } catch (e) {
        // Already released
      }
      wakelockRef.current = null;
    }
  }, []);

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    activityTimeoutRef.current = setTimeout(() => {
      if (Date.now() - lastActivityRef.current > autoReleaseTimeout) {
        if (wakelockRef.current) {
          release();
        }
      }
    }, autoReleaseTimeout);
  }, [release, autoReleaseTimeout]);

  const acquireIfHost = useCallback(async () => {
    if (isHost() && isMobile()) {
      return acquire();
    }
    return false;
  }, [acquire, isHost, isMobile]);

  // Auto-release when page is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        release();
      } else if (isHost() && isMobile()) {
        acquireIfHost();
      }
    };
    
    const handleBeforeUnload = () => {
      release();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      release();
    };
  }, [release, acquireIfHost, isHost, isMobile]);

  return {
    acquire,
    release,
    acquireIfHost,
    recordActivity,
    setHostStatus,
    isActive: () => !!wakelockRef.current,
  };
}
