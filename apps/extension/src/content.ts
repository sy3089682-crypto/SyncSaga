/// <reference types="chrome"/>

interface SyncMessage {
  type: 'SYNC_EVENT' | 'SYNC_STATE' | 'ROOM_JOIN' | 'ROOM_LEAVE';
  payload: any;
}

interface VideoState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  episode?: string;
}

class SyncSagaContentScript {
  private video: HTMLVideoElement | null = null;
  private socket: WebSocket | null = null;
  private roomId: string | null = null;
  private token: string | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private lastSyncTime: number = 0;
  private mutationObserver: MutationObserver | null = null;
  private overlayButton: HTMLButtonElement | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    // Load stored credentials
    const result = await chrome.storage.local.get(['token', 'roomId']);
    this.token = result.token || null;
    this.roomId = result.roomId || null;

    // Detect video elements
    this.detectVideo();
    this.setupMutationObserver();

    // Connect if we have a token
    if (this.token && this.roomId) {
      this.connectWebSocket();
    }

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      this.handleMessage(message);
      sendResponse({ success: true });
    });
  }

  private detectVideo() {
    const video = document.querySelector('video');
    if (video && video !== this.video) {
      this.video = video;
      this.setupVideoListeners();
      this.injectOverlay();
      
      // Send video detected notification
      this.sendToBackground({
        type: 'VIDEO_DETECTED',
        payload: { hasVideo: true }
      });
    }
  }

  private setupMutationObserver() {
    this.mutationObserver = new MutationObserver(() => {
      this.detectVideo();
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private setupVideoListeners() {
    if (!this.video) return;

    this.video.addEventListener('play', () => this.handleVideoEvent('play'));
    this.video.addEventListener('pause', () => this.handleVideoEvent('pause'));
    this.video.addEventListener('seeked', () => this.handleVideoEvent('seek'));
    this.video.addEventListener('ratechange', () => this.handleVideoEvent('speed'));
    this.video.addEventListener('waiting', () => this.handleVideoEvent('buffering'));
    this.video.addEventListener('canplay', () => this.handleVideoEvent('ready'));
  }

  private handleVideoEvent(type: string) {
    if (!this.video || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    const event = {
      room_id: this.roomId,
      type,
      timestamp: this.video.currentTime,
      playback_speed: this.video.playbackRate,
      episode: this.detectEpisode(),
    };

    this.socket.send(JSON.stringify({
      type: 'SYNC_EVENT',
      payload: event,
    }));
  }

  private detectEpisode(): string | undefined {
    // Common anime site patterns for episode detection
    const patterns = [
      // URL-based: /episode/123 or /watch/123
      () => {
        const match = window.location.pathname.match(/\/episode[s]?\/(\d+)/i);
        return match ? `Episode ${match[1]}` : undefined;
      },
      // Title/heading selectors
      () => {
        const selectors = [
          '[class*="episode"]',
          '[id*="episode"]',
          '[class*="ep-title"]',
          'h1',
          'h2',
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el?.textContent?.match(/\d+/)) {
            return el.textContent.trim();
          }
        }
        return undefined;
      },
    ];

    for (const pattern of patterns) {
      const result = pattern();
      if (result) return result;
    }
    return undefined;
  }

  private setupSyncInterval() {
    if (this.syncInterval) clearInterval(this.syncInterval);

    // Periodic resync every 5 seconds for drift correction
    this.syncInterval = setInterval(() => {
      if (this.video && this.socket?.readyState === WebSocket.OPEN) {
        const now = this.video.currentTime;
        const drift = Math.abs(now - this.lastSyncTime);
        
        // Only send if significant drift
        if (drift > 2) {
          this.socket.send(JSON.stringify({
            type: 'SYNC_EVENT',
            payload: {
              room_id: this.roomId,
              type: 'timestamp',
              timestamp: now,
            },
          }));
          this.lastSyncTime = now;
        }
      }
    }, 5000);
  }

  private connectWebSocket() {
    const wsUrl = process.env.WS_URL || 'ws://localhost:4000';
    this.socket = new WebSocket(`${wsUrl}?token=${this.token}`);

    this.socket.onopen = () => {
      console.log('[SyncSaga] WebSocket connected');
      
      // Join room
      this.socket?.send(JSON.stringify({
        type: 'ROOM_JOIN',
        payload: { roomId: this.roomId },
      }));

      this.setupSyncInterval();
    };

    this.socket.onmessage = (event) => {
      try {
        const message: SyncMessage = JSON.parse(event.data);
        this.handleSyncMessage(message);
      } catch (error) {
        console.error('[SyncSaga] Failed to parse message:', error);
      }
    };

    this.socket.onclose = () => {
      console.log('[SyncSaga] WebSocket disconnected, reconnecting in 3s...');
      setTimeout(() => this.connectWebSocket(), 3000);
    };

    this.socket.onerror = (error) => {
      console.error('[SyncSaga] WebSocket error:', error);
    };
  }

  private handleSyncMessage(message: SyncMessage) {
    if (!this.video) return;

    switch (message.type) {
      case 'SYNC_EVENT':
        this.applySyncEvent(message.payload);
        break;
      case 'SYNC_STATE':
        this.applySyncState(message.payload);
        break;
    }
  }

  private applySyncEvent(event: any) {
    if (!this.video) return;

    switch (event.type) {
      case 'play':
        this.video.play().catch(console.error);
        break;
      case 'pause':
        this.video.pause();
        break;
      case 'seek':
        this.video.currentTime = event.timestamp;
        break;
      case 'speed':
        this.video.playbackRate = event.playback_speed || 1;
        break;
    }
  }

  private applySyncState(state: any) {
    if (!this.video) return;

    // Apply timestamp with drift correction
    const timeDiff = Math.abs(this.video.currentTime - state.timestamp);
    if (timeDiff > 1) {
      this.video.currentTime = state.timestamp;
    }

    if (state.playback_state === 'playing' && this.video.paused) {
      this.video.play().catch(console.error);
    } else if (state.playback_state === 'paused' && !this.video.paused) {
      this.video.pause();
    }
  }

  private injectOverlay() {
    if (this.overlayButton) return;

    this.overlayButton = document.createElement('button');
    this.overlayButton.innerHTML = '🎬 SyncSaga';
    this.overlayButton.style.cssText = `
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 999999;
      padding: 8px 16px;
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
      transition: transform 0.2s, box-shadow 0.2s;
    `;
    this.overlayButton.addEventListener('mouseenter', () => {
      if (this.overlayButton) {
        this.overlayButton.style.transform = 'scale(1.05)';
        this.overlayButton.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.6)';
      }
    });
    this.overlayButton.addEventListener('mouseleave', () => {
      if (this.overlayButton) {
        this.overlayButton.style.transform = 'scale(1)';
        this.overlayButton.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
      }
    });

    document.body.appendChild(this.overlayButton);
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case 'CONNECT':
        this.token = message.token;
        this.roomId = message.roomId;
        chrome.storage.local.set({ token: this.token, roomId: this.roomId });
        this.connectWebSocket();
        break;
      case 'DISCONNECT':
        this.socket?.close();
        this.socket = null;
        this.roomId = null;
        chrome.storage.local.remove(['token', 'roomId']);
        break;
      case 'GET_STATE':
        this.sendToBackground({
          type: 'VIDEO_STATE',
          payload: this.getVideoState(),
        });
        break;
    }
  }

  private getVideoState(): VideoState | null {
    if (!this.video) return null;
    return {
      isPlaying: !this.video.paused,
      currentTime: this.video.currentTime,
      duration: this.video.duration,
      playbackRate: this.video.playbackRate,
      episode: this.detectEpisode(),
    };
  }

  private sendToBackground(message: any) {
    chrome.runtime.sendMessage(message).catch(() => {});
  }
}

// Initialize
new SyncSagaContentScript();
