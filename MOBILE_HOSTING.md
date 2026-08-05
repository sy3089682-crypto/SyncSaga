# 📱 Mobile Hosting for SyncSaga

## Current State Analysis

### What Works on Mobile Today
- **PWA Installable** — manifest.json supports standalone display mode
- **Room Joining** — users can join rooms via mobile browser
- **Chat & Reactions** — fully functional on mobile web
- **Voice Chat** — LiveKit integration works on mobile browsers
- **Sync Engine** — Socket.IO sync works on mobile

### What Doesn't Work for Hosting on Mobile
- **Video Source Detection** — Chrome extension (desktop-only) is primary method for detecting video element
- **Background Playback** — mobile browsers suspend tabs when backgrounded
- **Screen Wake Lock** — needed to prevent screen from sleeping during hosting
- **Push Notifications** — service worker needs upgrade for push notifications to guests
- **Host UI** — current room UI assumes desktop viewport

---

## 🎯 Solution: Mobile-First Hosting Architecture

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      MOBILE HOST FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User taps "Create Room" on mobile                          │
│     └─> PWA opens in standalone mode                          │
│                                                                 │
│  2. User picks anime / pastes video URL                        │
│     └─> AI detects episode (or manual selection)              │
│     └─> OR user shares screen (alternative for streaming)     │
│                                                                 │
│  3. Video plays in embedded player OR user navigates to        │
│     streaming site in-app browser                              │
│                                                                 │
│  4. Sync engine starts:                                        │
│     └─> Binds to video element (if embedded)                  │
│     └─> OR uses URL-based timestamp (if external)             │
│     └─> Sends heartbeat every 3s                              │
│                                                                 │
│  5. Mobile optimizations active:                               │
│     └─> Screen Wake Lock acquired                             │
│     └─> Audio focus requested                                  │
│     └─> Background sync handled                                │
│                                                                 │
│  6. Guests join via link/code                                  │
│     └─> Push notification sent to guests (when available)     │
│     └─> In-app notification for PWA-installed users           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Plan

### Phase 1: Core Mobile Hosting (PWA)

#### 1.1 Enhanced PWA Manifest & Service Worker

**File: `apps/web/public/manifest.json`**

Add mobile-specific capabilities:
```json
{
  "name": "SyncSaga",
  "short_name": "SyncSaga",
  "description": "Watch anime together in perfect sync",
  "start_url": "/",
  "display": "standalone",
  "display_override": ["window-controls-overlay", "standalone", "minimal-ui"],
  "orientation": "any",
  "background_color": "#0a0a0f",
  "theme_color": "#7c3aed",
  
  "categories": ["entertainment", "social", "video", "music"],
  
  "launch_handler": {
    "platforms": ["webapp"],
    "client_entries": ["existing-client"]
  },
  
  "share_target": {
    "action": "/api/share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  },
  
  "icons": [...],
  
  "screenshots": [...],
  
  "shortcuts": [
    { "name": "Create Room", "url": "/room/create", "description": "Host a watch party" },
    { "name": "My Rooms", "url": "/dashboard", "description": "Your hosted rooms" },
    { "name": "Discover", "url": "/discover", "description": "Find public rooms" }
  ],
  
  "prefer_related_applications": false
}
```

**File: `apps/web/public/sw.js` — Enhanced Service Worker**

```javascript
const CACHE = 'syncsaga-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/robots.txt',
  '/_next/static/css/*.css',
  '/_next/static/js/*.js',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // API calls: network-first with offline fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  
  // Static assets: cache-first
  event.respondWith(cacheFirst(event.request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || new Response('Offline', { status: 503 });
  }
}

// Push notifications for guests
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      roomId: data.roomId,
    },
    actions: data.actions || [],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click: open room
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  const roomId = event.notification.data?.roomId;
  
  event.waitUntil(
    clients.openWindow(roomId ? `/room/${roomId}` : url)
  );
});

// Background sync for pending messages
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncPendingMessages());
  }
});

async function syncPendingMessages() {
  // Re-send any pending messages when back online
  // Implementation depends on your message queue
}

// Handle messages from client
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CACHE_URLS') {
    event.waitUntil(cacheUrls(event.data.urls));
  }
});

async function cacheUrls(urls) {
  const cache = await caches.open(CACHE);
  await cache.addAll(urls);
}
```

---

#### 1.2 Screen Wake Lock API

**File: `apps/web/src/hooks/useWakeLock.ts`**

```typescript
'use client';

import { useEffect, useRef, useCallback } from 'react';

interface WakeLockConfig {
  enableOnHost?: boolean;      // Only acquire when user is host
  enableOnMobile?: boolean;    // Only on mobile devices
  autoReleaseTimeout?: number; // Auto-release after inactivity (ms)
}

export function useWakeLock(config: WakeLockConfig = {}) {
  const wakelockRef = useRef<WakeLockSentinel | null>(null);
  const enableOnHost = config.enableOnHost ?? true;
  const enableOnMobile = config.enableOnMobile ?? true;
  const autoReleaseTimeout = config.autoReleaseTimeout ?? 300000; // 5 min default
  const activityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const isMobile = useCallback(() => {
    if (!enableOnMobile) return false;
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, [enableOnMobile]);

  const isHost = useCallback(() => {
    if (!enableOnHost) return true;
    // Check if current user is host — implement based on your room state
    const room = document.querySelector('[data-user-role]');
    return room?.getAttribute('data-user-role') === 'host';
  }, [enableOnHost]);

  const acquire = useCallback(async () => {
    if (!('wakeLock' in navigator)) {
      console.warn('Screen Wake Lock not supported');
      return false;
    }
    
    if (!isMobile() || !isHost()) {
      return false;
    }
    
    try {
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
      wakelockRef.current.release();
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
        release();
      }
    }, autoReleaseTimeout);
  }, [release, autoReleaseTimeout]);

  // Auto-release wake lock when page is hidden (user switched tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        release();
      } else if (isHost() && isMobile()) {
        acquire();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [release, acquire, isHost, isMobile]);

  return {
    acquire,
    release,
    recordActivity,
    isActive: () => !!wakelockRef.current,
  };
}
```

---

#### 1.3 Audio Focus Management

**File: `apps/web/src/hooks/useAudioFocus.ts`**

```typescript
'use client';

import { useEffect, useRef, useCallback } from 'react';

interface AudioFocusConfig {
  onLost?: () => void;
  onRegained?: () => void;
  pauseOnLost?: boolean;
  resumeOnRegained?: boolean;
}

export function useAudioFocus(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  config: AudioFocusConfig = {}
) {
  const { onLost, onRegained, pauseOnLost = true, resumeOnRegained = true } = config;
  const wasPlayingRef = useRef(false);
  const pauseOnMobileBackground = useRef(true);

  // Track visibility for mobile background handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Mobile: pause video when tab hidden (saves battery, prevents autoplay issues)
        if (pauseOnMobileBackground.current && videoRef.current) {
          wasPlayingRef.current = !videoRef.current.paused;
          if (!videoRef.current.paused) {
            videoRef.current.pause();
          }
        }
      } else {
        // When returning: don't auto-resume (user may want to control)
        // But sync engine will correct if behind
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [videoRef]);

  // Request audio focus on mobile (Android-specific)
  useEffect(() => {
    // Android Chrome: request audio focus
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const handleAudioFocusChange = () => {
      // Web doesn't have direct audio focus API, but we can detect
      // if audio is being ducked by the OS
    };
    
    // On iOS: audio session configuration
    if (/iPhone|iPad/i.test(navigator.userAgent)) {
      // iOS handles audio automatically, but we should:
      // 1. Use play() on user interaction
      // 2. Handle interruptions (calls, Siri, etc.)
    }
    
    return () => {
      audioContext.close();
    };
  }, []);

  const handleInterruption = useCallback(() => {
    // Called when audio is interrupted (phone call, etc.)
    if (videoRef.current) {
      wasPlayingRef.current = !videoRef.current.paused;
      if (pauseOnLost && !videoRef.current.paused) {
        videoRef.current.pause();
        onLost?.();
      }
    }
  }, [videoRef, pauseOnLost, onLost]);

  const handleResume = useCallback(() => {
    if (videoRef.current && wasPlayingRef.current && resumeOnRegained) {
      videoRef.current.play().catch(console.error);
      onRegained?.();
    }
  }, [videoRef, wasPlayingRef, resumeOnRegained, onRegained]);

  return {
    handleInterruption,
    handleResume,
  };
}
```

---

#### 1.4 Mobile-Optimized Room Page

**File: `apps/web/src/app/room/[id]/page.tsx` — Mobile Additions**

Add mobile-specific UI and logic:

```tsx
'use client';

// ... existing imports ...
import { useWakeLock } from '@/hooks/useWakeLock';
import { useAudioFocus } from '@/hooks/useAudioFocus';
import { useMobileHost } from '@/hooks/useMobileHost';

export default function RoomPage() {
  // ... existing hooks ...
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const { acquire: acquireWakeLock, release: releaseWakeLock, recordActivity } = useWakeLock({
    enableOnHost: true,
    enableOnMobile: true,
  });
  
  const audioFocus = useAudioFocus(videoRef, {
    onLost: () => setAudioInterrupted(true),
    onRegained: () => setAudioInterrupted(false),
  });

  // Mobile host-specific hooks
  const {
    isMobileHost,
    requestScreenShare,
    endScreenShare,
    isScreenSharing,
    togglePictureInPicture,
    isInPIP,
  } = useMobileHost(roomId, videoRef);

  // Acquire wake lock when becoming host
  useEffect(() => {
    if (currentRoom?.host_id === user?.id && isMobile()) {
      acquireWakeLock();
    }
    return () => releaseWakeLock();
  }, [currentRoom?.host_id, user?.id, acquireWakeLock, releaseWakeLock]);

  // Record activity for wake lock timeout
  useEffect(() => {
    const handleInteraction = () => recordActivity();
    window.addEventListener('pointerdown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    return () => {
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [recordActivity]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-optimized header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            className="md:hidden p-2 -ml-2"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex-1 text-center">
            <h2 className="font-semibold truncate">{currentRoom?.name}</h2>
            <p className="text-xs text-text-muted">{roomMembers.length} watching</p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Host controls only visible to host on mobile */}
            {currentRoom?.host_id === user?.id && (
              <>
                <button
                  onClick={togglePictureInPicture}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    isInPIP ? 'bg-accent-cyan/20 text-accent-cyan' : 'hover:bg-surface'
                  )}
                  title="Picture-in-Picture"
                >
                  <Tv className="w-4 h-4" />
                </button>
                {isMobile() && (
                  <button
                    onClick={isScreenSharing ? endScreenShare : requestScreenShare}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      isScreenSharing
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-surface border border-border hover:border-primary/50'
                    )}
                  >
                    {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-16">
        {/* Video area - mobile optimized */}
        <div className="relative aspect-video bg-black/50 touch-none">
          {/* If hosting with embedded video */}
          {isHostingEmbedded && (
            <video
              ref={videoRef}
              className="w-full h-full"
              onClick={() => videoRef.current?.pause?.() ? videoRef.current.play() : null}
            />
          )}
          
          {/* If hosting with screen share */}
          {isScreenSharing && (
            <div className="absolute inset-0">
              {/* Screen share viewport */}
            </div>
          )}
          
          {/* Video URL input for external streams */}
          {isHostingExternal && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <input
                type="url"
                placeholder="Paste streaming URL..."
                className="w-full max-w-md px-4 py-3 rounded-xl bg-surface/95 border border-border text-sm"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onSubmit={() => navigateToVideo(videoUrl)}
              />
            </div>
          )}
          
          {/* Sync status indicator - always visible */}
          <div className="absolute top-4 left-4 flex gap-2">
            <SyncIndicator drift={currentDrift} />
          </div>
          
          {/* Playback controls - large touch targets */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-3">
              <button
                onClick={() => videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause()}
                className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
              >
                {videoRef.current?.paused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
              </button>
              
              {/* Seek bar - touch friendly */}
              <input
                type="range"
                min={0}
                max={duration}
                value={currentTime}
                onChange={(e) => videoRef.current.currentTime = parseFloat(e.target.value)}
                className="flex-1 h-2 rounded-full appearance-none bg-white/30"
              />
              
              <span className="text-white text-sm tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom tabs - thumb-friendly */}
        <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border/50 safe-area-inset-bottom">
          <div className="flex justify-around py-2">
            {[
              { icon: MessageSquare, label: 'Chat', active: activeTab === 'chat' },
              { icon: Users, label: 'People', active: activeTab === 'users' },
              { icon: Smile, label: 'React', active: activeTab === 'react' },
              { icon: Settings, label: 'Settings', active: activeTab === 'settings' },
            ].map(({ icon: Icon, label, active }) => (
              <button
                key={label}
                onClick={() => setActiveTab(label.toLowerCase() as any)}
                className={cn(
                  'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors',
                  active ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{label}</span>
                {active && (
                  <div className="w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </nav>
      </main>

      {/* Sidebar overlay for mobile */}
      {showSidebar && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSidebar(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-background p-4 overflow-y-auto">
            {/* Chat, users, etc. */}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

#### 1.5 Mobile Host Hook

**File: `apps/web/src/hooks/useMobileHost.ts`**

```typescript
'use client';

import { useState, useCallback, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { useAppStore } from '@/store/useAppStore';

interface MobileHostOptions {
  roomId: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

export function useMobileHost(options: MobileHostOptions) {
  const { roomId, videoRef } = options;
  const { user } = useAppStore();
  
  const [isHost, setIsHost] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isInPIP, setIsInPIP] = useState(false);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [hostingMode, setHostingMode] = useState<'embedded' | 'screen-share' | 'external-url'>('embedded');
  
  const screenShareRef = useRef<MediaStream | null>(null);
  const pipWindowRef = useRef<Window | null>(null);

  // Check if current user is host
  const checkHostStatus = useCallback(async () => {
    const socket = await getSocket();
    socket.emit('room:status', { roomId }, (response: any) => {
      setIsHost(response.isHost || response.user_role === 'host');
    });
  }, [roomId]);

  // Request screen share (for streaming sites)
  const requestScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });
      
      screenShareRef.current = stream;
      setScreenShareStream(stream);
      setIsScreenSharing(true);
      setHostingMode('screen-share');
      
      // Handle user stopping share via browser UI
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        endScreenShare();
      });
      
      return stream;
    } catch (err) {
      console.error('Screen share failed:', err);
      throw err;
    }
  }, []);

  // End screen share
  const endScreenShare = useCallback(() => {
    if (screenShareRef.current) {
      screenShareRef.current.getTracks().forEach(track => track.stop());
      screenShareRef.current = null;
    }
    setScreenShareStream(null);
    setIsScreenSharing(false);
    setHostingMode('embedded');
  }, []);

  // Picture-in-Picture for video
  const togglePictureInPicture = useCallback(async () => {
    if (!videoRef?.current) return;
    
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsInPIP(false);
      } else {
        await videoRef.current.requestPictureInPicture();
        setIsInPIP(true);
      }
    } catch (err) {
      console.error('PiP failed:', err);
    }
  }, [videoRef]);

  // Monitor PiP state
  useEffect(() => {
    const handlePiPEnter = () => setIsInPIP(true);
    const handlePiPExit = () => setIsInPIP(false);
    
    document.addEventListener('enterpictureinpicture', handlePiPEnter);
    document.addEventListener('leavepictureinpicture', handlePiPExit);
    
    return () => {
      document.removeEventListener('enterpictureinpicture', handlePiPEnter);
      document.removeEventListener('leavepictureinpicture', handlePiPExit);
    };
  }, []);

  // Start hosting with embedded video
  const startEmbeddedHost = useCallback(async (videoElement: HTMLVideoElement) => {
    setHostingMode('embedded');
    // The sync engine will bind to this video element
    // Host sends sync events based on video.currentTime
  }, []);

  // Start hosting with external URL
  const startExternalUrlHost = useCallback(async (url: string) => {
    setHostingMode('external-url');
    setVideoUrl(url);
    // Use AI fingerprinting to detect timestamp from URL
    // Fall back to asking user to seek to start
  }, []);

  return {
    isHost,
    isScreenSharing,
    isInPIP,
    hostingMode,
    screenShareStream,
    checkHostStatus,
    requestScreenShare,
    endScreenShare,
    togglePictureInPicture,
    startEmbeddedHost,
    startExternalUrlHost,
  };
}

// Helper: detect mobile
export function isMobile(): boolean {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// Helper: detect if device has touch screen
export function hasTouchScreen(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
```

---

### Phase 2: Push Notifications for Guests

#### 2.1 Server-Side Push Notification Setup

**File: `apps/api/src/services/push.service.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';
import * as webpush from 'web-push';

// Configure web push
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushService {
  private subscriptions: Map<string, PushSubscription> = new Map();
  
  async subscribe(userId: string, subscription: PushSubscription) {
    this.subscriptions.set(userId, subscription);
    // Also persist to database for reliability
    await this.saveSubscription(userId, subscription);
  }
  
  async unsubscribe(userId: string) {
    this.subscriptions.delete(userId);
    await this.deleteSubscription(userId);
  }
  
  async sendNotification(
    userId: string,
    title: string,
    body: string,
    options?: {
      url?: string;
      roomId?: string;
      icon?: string;
    }
  ) {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) return false;
    
    const message = JSON.stringify({
      title,
      body,
      url: options?.url,
      roomId: options?.roomId,
    });
    
    try {
      await webpush.sendNotification(subscription, message);
      return true;
    } catch (error) {
      console.error('Push notification failed:', error);
      // Remove invalid subscription
      if (error.statusCode === 410) {
        this.unsubscribe(userId);
      }
      return false;
    }
  }
  
  async broadcastToRoom(
    roomId: string,
    excludeUserIds: string[],
    title: string,
    body: string
  ) {
    // Get all subscriptions for room members
    const members = await this.getRoomMembers(roomId);
    const results = [];
    
    for (const member of members) {
      if (!excludeUserIds.includes(member.user_id)) {
        const success = await this.sendNotification(
          member.user_id,
          title,
          body,
          { url: `/room/${roomId}`, roomId }
        );
        results.push({ userId: member.user_id, success });
      }
    }
    
    return results;
  }
  
  private async saveSubscription(userId: string, sub: PushSubscription) {
    // Save to Supabase or your database
  }
  
  private async deleteSubscription(userId: string) {
    // Delete from database
  }
  
  private async getRoomMembers(roomId: string) {
    // Fetch room members with push subscriptions
  }
}

export const pushService = new PushService();
```

#### 2.2 Client-Side Push Subscription

**File: `apps/web/src/hooks/usePushNotifications.ts`**

```typescript
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';

interface PushNotificationOptions {
  onNotification?: (notification: PushNotification) => void;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

export function usePushNotifications(options: PushNotificationOptions = {}) {
  const { onNotification, onPermissionGranted, onPermissionDenied } = options;
  const serviceWorkerReady = useRef(false);
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  // Request permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      onPermissionGranted?.();
      return true;
    }
    
    if (Notification.permission === 'denied') {
      onPermissionDenied?.();
      return false;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      onPermissionGranted?.();
      return true;
    }
    onPermissionDenied?.();
    return false;
  }, [onPermissionGranted, onPermissionDenied]);

  // Subscribe to push
  const subscribe = useCallback(async () => {
    if (!vapidPublicKey) {
      console.error('VAPID public key not configured');
      return false;
    }
    
    if (!serviceWorkerReady.current) {
      console.error('Service worker not ready');
      return false;
    }
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      
      // Send subscription to server
      await api.post('/api/push/subscribe', {
        subscription: subscription.toJSON(),
      });
      
      return true;
    } catch (err) {
      console.error('Push subscription failed:', err);
      return false;
    }
  }, [vapidPublicKey]);

  // Check if notifications are available
  const isAvailable = useCallback(() => {
    return 'serviceWorker' in navigator && 'pushManager' in ServiceWorkerRegistration.prototype;
  }, []);

  // Handle incoming notifications
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    
    navigator.serviceWorker.ready.then((registration) => {
      serviceWorkerReady.current = true;
      
      // Listen for push events (when app is closed/minimized)
      notification.addEventListener('notificationclick', (event) => {
        onNotification?.(event.notification);
      });
    });
  }, [onNotification]);

  return {
    requestPermission,
    subscribe,
    isAvailable,
    permission: Notification.permission,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

---

### Phase 3: Enhanced Mobile Video Playback

#### 3.1 Mobile Video Player Component

**File: `apps/web/src/components/mobile/MobileVideoPlayer.tsx`**

```tsx
'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useSyncEngine } from '@/hooks/useSyncEngine';

interface MobileVideoPlayerProps {
  src: string;
  roomId: string;
  isHost: boolean;
  autoPlay?: boolean;
}

export function MobileVideoPlayer({ src, roomId, isHost, autoPlay = false }: MobileVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Sync engine for host
  const { onSeek, onPlaybackChange } = useSyncEngine(roomId, {
    getCurrentTime: () => videoRef.current?.currentTime ?? 0,
    isPlaying: () => !videoRef.current?.paused,
    onSeek: (timestamp) => {
      if (videoRef.current) {
        videoRef.current.currentTime = timestamp;
      }
    },
    onPlaybackStateChange: (state) => {
      if (videoRef.current) {
        if (state === 'playing' && videoRef.current.paused) {
          videoRef.current.play();
        } else if (state === 'paused' && !videoRef.current.paused) {
          videoRef.current.pause();
        }
      }
    },
    onSpeedChange: (speed) => {
      if (videoRef.current) {
        videoRef.current.playbackRate = speed;
      }
    },
  });

  // Mobile-specific optimizations
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleWaiting = () => setBuffering(true);
    const handleCanPlay = () => setBuffering(false);
    const handleProgress = () => {
      // Update buffered amount for progress bar
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('progress', handleProgress);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('progress', handleProgress);
    };
  }, []);

  // Touch handling for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Single tap to toggle play/pause
    // Swipe to seek
  }, []);

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden touch-none">
      <video
        ref={videoRef}
        className="w-full h-full"
        src={src}
        autoPlay={autoPlay && isHost}
        playsInline  // Critical for iOS
        muted={!isHost}  // Mobile browsers require interaction for autoplay
        onClick={() => {
          if (videoRef.current) {
            if (videoRef.current.paused) {
              videoRef.current.play();
            } else {
              videoRef.current.pause();
            }
          }
        }}
      />
      
      {/* Buffering indicator */}
      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-8 h-8 border-2 border-white/50 border-t-white rounded-full animate-spin" />
        </div>
      )}
      
      {/* Touch controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        {/* Play/Pause button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (videoRef.current) {
              if (videoRef.current.paused) {
                videoRef.current.play();
              } else {
                videoRef.current.pause();
              }
            }
          }}
          className="w-12 h-12 rounded-full bg-white/30 backdrop-blur flex items-center justify-center mx-auto mb-3"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </button>
        
        {/* Seek bar */}
        <div className="relative mb-2">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              if (videoRef.current) {
                videoRef.current.currentTime = parseFloat(e.target.value);
              }
            }}
            className="w-full h-1.5 rounded-full appearance-none bg-white/30 cursor-pointer"
          />
        </div>
        
        {/* Time display */}
        <div className="flex justify-between text-white text-sm">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        
        {/* Playback speed (host only) */}
        {isHost && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-white/70">Speed:</span>
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
              <button
                key={speed}
                onClick={(e) => {
                  e.stopPropagation();
                  if (videoRef.current) {
                    videoRef.current.playbackRate = speed;
                    setPlaybackRate(speed);
                  }
                }}
                className={`px-2 py-0.5 rounded text-xs ${
                  playbackRate === speed
                    ? 'bg-white/30 text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

---

### Phase 4: Stream-Specific Mobile Hosting

#### 4.1 Supported Streaming Sites for Mobile

| Site | Method | Mobile Support |
|------|--------|----------------|
| YouTube | URL-based timestamp + embedded player | ✅ Full |
| Crunchyroll | URL detection + embedded player | ✅ Full |
| Netflix | Screen share only (DRM) | ⚠️ Screen share |
| Disney+ | Screen share only (DRM) | ⚠️ Screen share |
| Hulu | Screen share only (DRM) | ⚠️ Screen share |
| Local files | Upload or file picker | ✅ Full |
| Vimeo | URL-based + embedded | ✅ Full |

#### 4.2 Screen Share Hosting Flow

For DRM-protected streaming sites (Netflix, Disney+, Hulu), mobile hosting works via screen sharing:

```typescript
// File: apps/web/src/components/mobile/ScreenShareHost.tsx

'use client';

import { useState, useCallback } from 'react';
import { useMobileHost } from '@/hooks/useMobileHost';

export function ScreenShareHost({ roomId }: { roomId: string }) {
  const {
    isScreenSharing,
    requestScreenShare,
    endScreenShare,
    screenShareStream,
  } = useMobileHost({ roomId });

  const [error, setError] = useState<string | null>(null);

  const handleStartScreenShare = useCallback(async () => {
    try {
      await requestScreenShare();
      setError(null);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Screen share permission denied. Please allow in browser prompt.');
      } else if (err.name === 'NotFoundError') {
        setError('No screen detected. Make sure you have displays available.');
      } else {
        setError('Failed to start screen share: ' + err.message);
      }
    }
  }, [requestScreenShare]);

  if (!isScreenSharing) {
    return (
      <div className="relative aspect-video bg-black rounded-xl flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <Tv className="w-8 h-8 text-primary" />
        </div>
        
        <h3 className="text-lg font-semibold mb-2">Share Your Screen</h3>
        <p className="text-sm text-text-secondary mb-4 max-w-xs">
          To host Netflix, Disney+, or other streaming sites, share your screen.
          Your friends will see everything on your display.
        </p>
        
        <button
          onClick={handleStartScreenShare}
          className="px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors"
        >
          Start Sharing
        </button>
        
        {error && (
          <p className="mt-3 text-sm text-red-400">{error}</p>
        )}
        
        <p className="mt-4 text-xs text-text-muted">
          Tip: Use landscape mode for best experience
        </p>
      </div>
    );
  }

  return (
    <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
      {/* Screen share preview */}
      <video
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
        src={screenShareStream?.toURL()}
      />
      
      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <button
          onClick={endScreenShare}
          className="px-4 py-2 rounded-lg bg-red-500/80 text-white text-sm font-medium hover:bg-red-500 transition-colors"
        >
          Stop Sharing
        </button>
      </div>
      
      {/* Warning for DRM content */}
      <div className="absolute top-2 left-2 right-2 px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs flex items-center gap-2">
        <span>⚠️</span>
        <span>DRM content may have black screen. Use screen share mode.</span>
      </div>
    </div>
  );
}
```

---

## 📋 Complete Implementation Checklist

### P0 — Must Have for Mobile Hosting

- [ ] Enhanced PWA manifest with mobile shortcuts
- [ ] Service worker with push notification support
- [ ] Screen Wake Lock API integration for hosts
- [ ] Mobile-optimized room UI with touch-friendly controls
- [ ] Picture-in-Picture support for continued viewing
- [ ] Screen share capability for DRM content
- [ ] Audio focus management for mobile browsers
- [ ] Host status detection on mobile
- [ ] Mobile-optimized video player with large touch targets

### P1 — Should Have

- [ ] Push notifications to guests when host starts
- [ ] Background sync for messages when connection drops
- [ ] Landscape/portrait orientation handling
- [ ] Safe area insets for notched devices
- [ ] Pull-to-refresh for room updates
- [ ] Haptic feedback on reactions (if supported)
- [ ] Offline indicator when connection lost
- [ ] Connection quality indicator

### P2 — Nice to Have

- [ ] Native app shell (React Native or Capacitor wrapper)
- [ ] Biometric authentication for quick access
- [ ] Widget for quick room creation/joining
- [ ] Siri/Google Assistant integration
- [ ] App shortcuts (long-press icon actions)
- [ ] Theme customization (dark always on mobile)

---

## 🔐 Mobile Security Considerations

1. **Session Management**
   - Use short-lived JWT tokens with refresh
   - Implement biometric unlock for returning users
   - Auto-logout after extended background time

2. **Screen Sharing Privacy**
   - Clear visual indicator when sharing
   - Option to share only app window (not full screen)
   - Warning before sharing about visible content

3. **Push Notification Privacy**
   - Don't include sensitive info in notification body
   - Use generic text like "Your friend started a room" not "Watching [spoiler anime]"

4. **Network Security**
   - All WebSocket connections over WSS
   - Certificate pinning for production builds
   - Detect and warn on insecure networks

---

## 📊 Testing Mobile Hosting

### Test Scenarios

1. **Basic Host Flow**
   - Create room on mobile PWA
   - Play embedded YouTube video
   - Verify sync with desktop guest

2. **Screen Share Host**
   - Start screen share on mobile
   - Navigate to Netflix/Disney+
   - Verify guests see shared content

3. **Background/Foreground**
   - Host switches to another app
   - Verify wake lock released
   - Return and verify re-sync

4. **Multiple Guests**
   - Host on mobile, 3+ guests on desktop
   - Verify sync stability over time

5. **Network Changes**
   - Host switches WiFi to cellular
   - Verify reconnection and sync recovery

6. **Push Notifications**
   - User has PWA installed
   - Host starts room
   - Verify push notification received

---

## 🚀 Quick Start: Minimal Mobile Hosting

If you want to ship mobile hosting quickly, here's the minimal path:

1. **Day 1-2**: Update PWA manifest, add wake lock
2. **Day 3-4**: Mobile-optimized room UI with touch controls
3. **Day 5-6**: Screen share for DRM content
4. **Day 7-8**: Testing and bug fixes
5. **Day 9-10**: Push notification setup (optional for V1)

This gets mobile hosting working in about 2 weeks with core functionality.
