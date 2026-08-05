'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { api } from '@/lib/api';

interface PushNotificationOptions {
  onNotification?: (notification: PushNotificationData) => void;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
  vapidPublicKey?: string;
}

interface PushNotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    roomId?: string;
  };
  tag?: string;
  renotify?: boolean;
}

interface NotificationPermissionState {
  state: NotificationPermission;
  canAsk: boolean;
}

export function usePushNotifications(options: PushNotificationOptions = {}) {
  const {
    onNotification,
    onPermissionGranted,
    onPermissionDenied,
    vapidPublicKey = '',
  } = options;

  const [permissionState, setPermissionState] = useState<NotificationPermissionState>({ 
    state: 'default', 
    canAsk: true 
  });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const serviceWorkerRef = useRef<ServiceWorkerRegistration | null>(null);
  
  // Use a ref to store the subscribe function to avoid circular dependencies
  const subscribeRef = useRef<(() => Promise<boolean>) | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 
      'serviceWorker' in navigator && 
      'PushManager' in window &&
      'Notification' in window;
    
    setIsSupported(supported);
    
    if (supported) {
      // Check current notification permission
      setPermissionState({
        state: Notification.permission,
        canAsk: Notification.permission !== 'denied',
      });
      
      // Check if already subscribed
      checkSubscription();
    }
  }, []);

  // Check existing subscription
  const checkSubscription = useCallback(async () => {
    if (!vapidPublicKey) {
      console.warn('VAPID public key not configured');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      serviceWorkerRef.current = registration;
      
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
      
      if (subscription) {
        // Verify subscription is still valid
        try {
          await fetch('/api/push/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: subscription.toJSON() }),
          });
        } catch {
          // Subscription might be invalid, unsubscribe
          await unsubscribe();
        }
      }
    } catch (err) {
      console.error('Failed to check subscription:', err);
    }
  }, [vapidPublicKey]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    if (permissionState.state !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    if (!vapidPublicKey) {
      console.error('VAPID public key not configured');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      serviceWorkerRef.current = registration;

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });

      // Send subscription to server
      const response = await api.post('/api/push/subscribe', {
        subscription: subscription.toJSON(),
      });

      if (response && (response as any).success) {
        setIsSubscribed(true);
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Failed to subscribe:', err);
      return false;
    }
  }, [isSupported, permissionState.state, vapidPublicKey]);

  // Store subscribe in ref to avoid circular dependency
  subscribeRef.current = subscribe;

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    if (permissionState.state === 'granted') {
      onPermissionGranted?.();
      return true;
    }

    if (permissionState.state === 'denied') {
      onPermissionDenied?.();
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      const newState: NotificationPermission = result;
      setPermissionState({
        state: newState,
        canAsk: newState !== 'denied',
      });

      if (newState === 'granted') {
        onPermissionGranted?.();
        // After permission granted, subscribe
        if (subscribeRef.current) {
          await subscribeRef.current();
        }
        return true;
      } else {
        onPermissionDenied?.();
        return false;
      }
    } catch (err) {
      console.error('Failed to request permission:', err);
      return false;
    }
  }, [isSupported, permissionState.state, onPermissionGranted, onPermissionDenied]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!serviceWorkerRef.current) return false;

    try {
      const subscription = await serviceWorkerRef.current.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        
        // Notify server
        await api.post('/api/push/unsubscribe', {});
        
        setIsSubscribed(false);
        return true;
      }
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
    }
    
    return false;
  }, []);

  // Listen for push messages when app is open
  useEffect(() => {
    if (!isSupported) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data && (event.data as any).type === 'PUSH_NOTIFICATION') {
        onNotification?.((event.data as any).payload);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [isSupported, onNotification]);

  // Get notification permission status
  const getPermissionStatus = useCallback((): NotificationPermissionState => {
    return {
      state: Notification.permission,
      canAsk: Notification.permission !== 'denied',
    };
  }, []);

  return {
    permission: permissionState.state,
    isSubscribed,
    isSupported,
    requestPermission,
    subscribe,
    unsubscribe,
    checkSubscription,
    getPermissionStatus,
    // Send test notification (for development)
    sendTest: useCallback(async (title: string, body: string) => {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'test-notification',
        });
      }
    }, []),
  };
}

// Helper: Convert base64url to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}
