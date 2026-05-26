interface SyncMessage {
  type: 'CONNECT' | 'DISCONNECT' | 'GET_STATE' | 'VIDEO_DETECTED' | 'VIDEO_STATE' | 'SYNC_EVENT' | 'SYNC_STATE';
  payload?: any;
}

interface VideoState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  episode: string | null;
  src: string | null;
}

class UniversalVideoSync {
  private video: HTMLVideoElement | null = null;
  private ws: WebSocket | null = null;
  private roomId: string | null = null;
  private token: string | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private lastSyncTime: number = 0;
  private observer: MutationObserver | null = null;
  private overlay: HTMLDivElement | null = null;
  private overlayVisible: boolean = true;
  private isDragging: boolean = false;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private boundEvents: Map<string, EventListener> = new Map();
  private videoObservers: MutationObserver[] = [];
  private iframeVideoFound: boolean = false;

  constructor() {
    this.loadState();
    this.listenForMessages();
    this.startVideoDetection();
  }

  private loadState() {
    chrome.storage.local.get(['token', 'roomId'], (result) => {
      this.token = result.token || null;
      this.roomId = result.roomId || null;
      if (this.token && this.roomId) this.connect();
    });
  }

  private listenForMessages() {
    chrome.runtime.onMessage.addListener((msg: SyncMessage, _sender, sendResponse) => {
      switch (msg.type) {
        case 'CONNECT':
          this.handleConnect(msg.payload);
          sendResponse?.({ success: true });
          break;
        case 'DISCONNECT':
          this.handleDisconnect();
          sendResponse?.({ success: true });
          break;
        case 'GET_STATE':
          sendResponse?.(this.getVideoState());
          break;
      }
    });
  }

  private handleConnect(payload: { token: string; roomId: string }) {
    this.token = payload.token;
    this.roomId = payload.roomId;
    chrome.storage.local.set({ token: this.token, roomId: this.roomId });
    this.connect();
  }

  private handleDisconnect() {
    this.disconnect();
    chrome.storage.local.remove(['token', 'roomId']);
  }

  private startVideoDetection() {
    this.scanForVideo();

    this.observer = new MutationObserver(() => {
      this.debounce(() => this.scanForVideo(), 500);
    });
    this.observer.observe(document.body, { childList: true, subtree: true, attributes: false });

    window.addEventListener('popstate', () => this.debounce(() => this.scanForVideo(), 500));
    window.addEventListener('hashchange', () => this.debounce(() => this.scanForVideo(), 500));

    this.watchShadowDom(document.body);
  }

  private watchShadowDom(root: Node) {
    if (root instanceof ShadowRoot) {
      const shadowObserver = new MutationObserver(() => {
        this.debounce(() => this.scanForVideo(), 300);
      });
      shadowObserver.observe(root, { childList: true, subtree: true });
      this.videoObservers.push(shadowObserver);
    }

    if (root instanceof Element) {
      if (root.shadowRoot) {
        this.watchShadowDom(root.shadowRoot);
      }
      for (const child of root.childNodes) {
        if (child instanceof Element) {
          this.watchShadowDom(child);
        }
      }
    }
  }

  private scanForVideo() {
    const videos = document.querySelectorAll('video');
    for (const video of Array.from(videos)) {
      if (video.readyState >= 1 || video.src || video.querySelector('source')) {
        if (video !== this.video) {
          this.attachToVideo(video);
        }
        return;
      }
    }

    if (!this.iframeVideoFound) {
      const iframes = document.querySelectorAll('iframe');
      for (const iframe of Array.from(iframes)) {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            const iframeVideos = iframeDoc.querySelectorAll('video');
            for (const video of Array.from(iframeVideos)) {
              if (video.readyState >= 1 || video.src) {
                if (video !== this.video) {
                  this.attachToVideo(video);
                  this.iframeVideoFound = true;
                }
                return;
              }
            }
          }
        } catch {}
      }
    }
  }

  private attachToVideo(video: HTMLVideoElement) {
    this.video = video;
    this.bindVideoEvents();
    this.injectOverlay();

    chrome.runtime.sendMessage({
      type: 'VIDEO_DETECTED',
      payload: { hasVideo: true, src: video.src || 'unknown' },
    });

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.startSyncLoop();
    }
  }

  private bindVideoEvents() {
    if (!this.video) return;

    this.boundEvents.forEach((listener, event) => {
      this.video?.removeEventListener(event, listener);
    });
    this.boundEvents.clear();

    const events = ['play', 'pause', 'seeked', 'ratechange', 'waiting', 'canplay', 'ended'];
    for (const event of events) {
      const handler = () => this.onVideoEvent(event);
      this.video.addEventListener(event, handler);
      this.boundEvents.set(event, handler);
    }
  }

  private onVideoEvent(type: string) {
    if (!this.video || this.ws?.readyState !== WebSocket.OPEN || !this.roomId) return;

    const state = this.getVideoState();
    this.ws.send(JSON.stringify({
      type: 'SYNC_EVENT',
      payload: {
        type: type === 'seeked' ? 'seek' : type === 'ratechange' ? 'speed' : type === 'ended' ? 'pause' : type,
        timestamp: state.currentTime,
        playback_speed: state.playbackRate,
        episode: state.episode,
        duration: state.duration,
      },
    }));
  }

  private connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const wsUrl = 'wss://api.syncsaga.app/ws';
    this.ws = new WebSocket(`${wsUrl}?token=${this.token}`);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.ws!.send(JSON.stringify({ type: 'ROOM_JOIN', payload: { roomId: this.roomId } }));
      this.startSyncLoop();
      this.startHeartbeat();
      this.updateOverlayStatus('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'SYNC_EVENT':
            this.applySyncEvent(msg.payload);
            break;
          case 'SYNC_STATE':
            this.applySyncState(msg.payload);
            break;
          case 'ROOM_JOINED':
          case 'ROOM_UPDATE':
            this.updateOverlayStatus('connected');
            break;
          case 'ERROR':
            this.updateOverlayStatus('disconnected');
            break;
        }
      } catch {}
    };

    this.ws.onclose = () => {
      this.updateOverlayStatus('disconnected');
      this.reconnectAttempts++;
      if (this.reconnectAttempts < this.maxReconnectAttempts && this.token && this.roomId) {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        setTimeout(() => this.connect(), delay);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private disconnect() {
    if (this.ws) {
      if (this.roomId) {
        this.ws.send(JSON.stringify({ type: 'ROOM_LEAVE', payload: { roomId: this.roomId } }));
      }
      this.ws.close();
      this.ws = null;
    }
    this.stopSyncLoop();
    this.stopHeartbeat();
    this.reconnectAttempts = this.maxReconnectAttempts;
    this.roomId = null;
    this.token = null;
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
  }

  private startSyncLoop() {
    this.stopSyncLoop();
    this.syncInterval = setInterval(() => {
      if (this.video && this.ws?.readyState === WebSocket.OPEN) {
        const drift = Math.abs(this.video.currentTime - this.lastSyncTime);
        if (drift > 1.5) {
          this.ws.send(JSON.stringify({
            type: 'SYNC_EVENT',
            payload: { type: 'timestamp', timestamp: this.video.currentTime },
          }));
          this.lastSyncTime = this.video.currentTime;
        }
      }
    }, 4000);
  }

  private stopSyncLoop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'HEARTBEAT', payload: { timestamp: Date.now() } }));
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private applySyncEvent(event: any) {
    if (!this.video) return;

    switch (event.type) {
      case 'play':
        if (this.video.paused) this.video.play().catch(() => {});
        break;
      case 'pause':
        if (!this.video.paused) this.video.pause();
        break;
      case 'seek':
        this.video.currentTime = event.timestamp;
        break;
      case 'speed':
        if (event.playback_speed) this.video.playbackRate = event.playback_speed;
        break;
      case 'timestamp':
        this.lastSyncTime = event.timestamp;
        break;
    }
  }

  private applySyncState(state: any) {
    if (!this.video) return;

    if (state.timestamp !== undefined && Math.abs(this.video.currentTime - state.timestamp) > 1.5) {
      this.video.currentTime = state.timestamp;
    }
    if (state.playback_state === 'playing' && this.video.paused) {
      this.video.play().catch(() => {});
    }
    if (state.playback_state === 'paused' && !this.video.paused) {
      this.video.pause();
    }
    if (state.speed) {
      this.video.playbackRate = state.speed;
    }
    this.lastSyncTime = state.timestamp || this.video.currentTime;
  }

  private getVideoState(): VideoState | null {
    if (!this.video) return null;
    return {
      isPlaying: !this.video.paused,
      currentTime: this.video.currentTime,
      duration: this.video.duration || 0,
      playbackRate: this.video.playbackRate,
      episode: this.detectEpisode(),
      src: this.video.src || null,
    };
  }

  private detectEpisode(): string | null {
    const pathname = window.location.pathname;

    const patterns = [
      /\/episode[s]?\/(\d+)/i,
      /\/e[\/-](\d+)/i,
      /\/watch\/[^/]+-episode-(\d+)/i,
      /\/watch\/(?:[^/]+)?.*?(\d+)/i,
      /ep-(\d+)/i,
      /(\d+)(?:st|nd|rd|th)-episode/i,
    ];

    for (const pattern of patterns) {
      const match = pathname.match(pattern);
      if (match) return `Episode ${match[1]}`;
    }

    const metaSelectors = [
      '[class*="episode"]',
      '[id*="episode"]',
      '[data-episode]',
      '.video-title',
      '.player-title',
      'h1',
      '.title',
      '[class*="video-info"]',
    ];

    for (const selector of metaSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent) {
        const numMatch = el.textContent.match(/(?:episode|ep|e)\s*(\d+)/i);
        if (numMatch) return `Episode ${numMatch[1]}`;
      }
    }

    return null;
  }

  private updateOverlayStatus(status: 'connected' | 'disconnected' | 'syncing') {
    if (!this.overlay) return;
    const dot = this.overlay.querySelector('.ss-dot') as HTMLDivElement;
    const text = this.overlay.querySelector('.ss-text') as HTMLSpanElement;
    if (!dot || !text) return;

    switch (status) {
      case 'connected':
        dot.style.background = '#10b981';
        text.textContent = `Room: ${this.roomId?.slice(0, 8)}...`;
        break;
      case 'disconnected':
        dot.style.background = '#ef4444';
        text.textContent = 'Disconnected';
        break;
      case 'syncing':
        dot.style.background = '#f59e0b';
        text.textContent = 'Syncing...';
        break;
    }
  }

  private injectOverlay() {
    if (this.overlay) {
      this.overlay.style.display = 'flex';
      return;
    }

    const overlay = document.createElement('div');
    overlay.innerHTML = `
      <div class="ss-dot" style="width:8px;height:8px;border-radius:50%;background:#ef4444;flex-shrink:0"></div>
      <span class="ss-text" style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">SyncSaga</span>
      <button class="ss-mute" style="background:none;border:none;cursor:pointer;padding:2px;display:flex;align-items:center;opacity:0.7;flex-shrink:0" title="Toggle mic">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
      </button>
      <button class="ss-minimize" style="background:none;border:none;cursor:pointer;padding:2px;display:flex;align-items:center;opacity:0.7;flex-shrink:0" title="Minimize">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    `;

    overlay.style.cssText = [
      'position:fixed;bottom:80px;right:20px;z-index:2147483647;',
      'display:flex;align-items:center;gap:8px;',
      'padding:8px 14px;',
      'background:rgba(10,10,15,0.92);',
      'backdrop-filter:blur(12px);',
      '-webkit-backdrop-filter:blur(12px);',
      'border:1px solid rgba(139,92,246,0.3);',
      'border-radius:100px;',
      'color:white;',
      'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;',
      'font-size:12px;',
      'box-shadow:0 4px 20px rgba(0,0,0,0.5),0 0 0 1px rgba(139,92,246,0.1);',
      'cursor:grab;',
      'user-select:none;',
      'min-width:120px;',
      'max-width:240px;',
      'transition:box-shadow 0.2s,transform 0.2s;',
    ].join('');

    const muteBtn = overlay.querySelector('.ss-mute') as HTMLButtonElement;
    muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const svg = muteBtn.querySelector('svg')!;
      const isMuted = !svg.innerHTML.includes('M9');
      if (isMuted) {
        svg.innerHTML = '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>';
      } else {
        svg.innerHTML = '<line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>';
      }
    });

    const minimizeBtn = overlay.querySelector('.ss-minimize') as HTMLButtonElement;
    minimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.overlayVisible = !this.overlayVisible;
      const text = overlay.querySelector('.ss-text') as HTMLSpanElement;
      const dot = overlay.querySelector('.ss-dot') as HTMLDivElement;
      if (this.overlayVisible) {
        text.style.display = '';
        dot.style.display = '';
        muteBtn.style.display = '';
        overlay.style.minWidth = '120px';
        overlay.style.maxWidth = '240px';
        minimizeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
      } else {
        text.style.display = 'none';
        dot.style.display = 'none';
        muteBtn.style.display = 'none';
        overlay.style.minWidth = 'auto';
        overlay.style.maxWidth = 'auto';
        minimizeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>';
      }
    });

    overlay.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      const rect = overlay.getBoundingClientRect();
      this.dragOffsetX = e.clientX - rect.left;
      this.dragOffsetY = e.clientY - rect.top;
      overlay.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const x = Math.max(0, Math.min(window.innerWidth - overlay.offsetWidth, e.clientX - this.dragOffsetX));
      const y = Math.max(0, Math.min(window.innerHeight - overlay.offsetHeight, e.clientY - this.dragOffsetY));
      overlay.style.left = `${x}px`;
      overlay.style.right = 'auto';
      overlay.style.top = `${y}px`;
      overlay.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;
      overlay.style.cursor = 'grab';
    });

    this.overlay = overlay;
    document.body.appendChild(overlay);
  }

  private debounce(fn: () => void, delay: number) {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(fn, delay);
  }
}

new UniversalVideoSync();
