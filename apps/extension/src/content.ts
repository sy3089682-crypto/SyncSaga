interface ExtensionMessage {
  type: 'CONNECT' | 'DISCONNECT' | 'GET_STATE' | 'VIDEO_DETECTED' | 'VIDEO_STATE';
  payload?: any;
}

interface VideoState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  episode: string | null;
}

const SITE_SELECTORS: Record<string, { video: string; episode?: () => string | null }> = {
  'crunchyroll.com': {
    video: '.video-player video',
    episode: () => {
      const match = window.location.pathname.match(/\/watch\/([^/]+)/);
      return match ? match[1] : null;
    },
  },
  'hianime.to': {
    video: '#player video',
    episode: () => {
      const match = window.location.pathname.match(/\/watch\/([^/]+)/);
      return match ? match[1] : null;
    },
  },
  'gogoanime': {
    video: '.play-video iframe video',
    episode: () => {
      const el = document.querySelector('[class*="episode"]');
      return el?.textContent?.match(/episode\s*(\d+)/i)?.[1] || null;
    },
  },
  '9anime': {
    video: '.player video',
    episode: () => {
      const match = window.location.pathname.match(/\/watch\/([^.]+)/);
      return match ? match[1] : null;
    },
  },
  'bilibili.com': {
    video: '.bpx-player video',
    episode: () => {
      const match = window.location.pathname.match(/\/video\/([^/]+)/);
      return match ? match[1] : null;
    },
  },
  'funimation.com': {
    video: '.vjs-tech',
    episode: () => {
      const match = window.location.pathname.match(/\/v\/([^/]+)/);
      return match ? match[1] : null;
    },
  },
};

class SyncSagaContentScript {
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

  constructor() {
    chrome.storage.local.get(['token', 'roomId', 'memberCount', 'roomName'], (result) => {
      this.token = result.token || null;
      this.roomId = result.roomId || null;
      this.detectVideo();
      this.watchDom();
      if (this.token && this.roomId) this.connect();
    });

    chrome.runtime.onMessage.addListener((msg: ExtensionMessage) => {
      switch (msg.type) {
        case 'CONNECT':
          this.token = msg.payload.token;
          this.roomId = msg.payload.roomId;
          chrome.storage.local.set({ token: this.token, roomId: this.roomId });
          this.connect();
          break;
        case 'DISCONNECT':
          this.disconnect();
          break;
        case 'GET_STATE':
          chrome.runtime.sendMessage({ type: 'VIDEO_STATE', payload: this.getState() });
          break;
      }
    });
  }

  private getSiteConfig() {
    const hostname = window.location.hostname;
    for (const [domain, config] of Object.entries(SITE_SELECTORS)) {
      if (hostname.includes(domain)) return config;
    }
    return null;
  }

  private detectVideo() {
    const siteConfig = this.getSiteConfig();
    let video: HTMLVideoElement | null = null;

    if (siteConfig) {
      video = document.querySelector(siteConfig.video) as HTMLVideoElement;
    } else {
      video = document.querySelector('video');
    }

    if (video && video !== this.video) {
      this.video = video;
      this.bindVideoEvents();
      this.injectOverlay();
      chrome.runtime.sendMessage({ type: 'VIDEO_DETECTED', payload: { hasVideo: true } });
    }
  }

  private watchDom() {
    this.observer = new MutationObserver(() => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.detectVideo(), 500);
    });
    this.observer.observe(document.body, { childList: true, subtree: true, attributes: false });

    window.addEventListener('popstate', () => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.detectVideo(), 500);
    });

    window.addEventListener('hashchange', () => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.detectVideo(), 500);
    });
  }

  private bindVideoEvents() {
    if (!this.video) return;
    const events = ['play', 'pause', 'seeked', 'ratechange', 'waiting', 'canplay'] as const;
    events.forEach(e => this.video!.addEventListener(e, () => this.onVideoEvent(e)));
  }

  private onVideoEvent(type: string) {
    if (!this.video || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: 'SYNC_EVENT',
      payload: {
        type,
        timestamp: this.video.currentTime,
        playback_speed: this.video.playbackRate,
        episode: this.detectEpisode(),
      },
    }));
  }

  private detectEpisode(): string | null {
    const siteConfig = this.getSiteConfig();
    if (siteConfig?.episode) {
      return siteConfig.episode();
    }

    const patterns = [
      () => (window.location.pathname.match(/\/episode[s]?\/(\d+)/i) || [])[1],
      () => {
        for (const sel of ['[class*="episode"]', '[id*="episode"]', 'h1', 'h2', '.video-title', '.player-title']) {
          const el = document.querySelector(sel);
          if (el?.textContent?.match(/\d+/)) return el.textContent.trim();
        }
        return null;
      },
    ];
    for (const p of patterns) {
      const r = p();
      if (r) return `Episode ${r}`;
    }
    return null;
  }

  private connect() {
    const wsUrl = process.env.EXTENSION_WS_URL || 'ws://localhost:4000/ws';
    this.ws = new WebSocket(`${wsUrl}?token=${this.token}`);

    this.ws.onopen = () => {
      this.ws!.send(JSON.stringify({ type: 'ROOM_JOIN', payload: { roomId: this.roomId } }));
      this.startSyncLoop();
      this.updateOverlayStatus('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'SYNC_EVENT') this.applySync(msg.payload);
        if (msg.type === 'SYNC_STATE') this.applyState(msg.payload);
        if (msg.type === 'ROOM_UPDATE') {
          chrome.storage.local.set({ memberCount: msg.payload.memberCount, roomName: msg.payload.roomName });
        }
      } catch {}
    };

    this.ws.onclose = () => {
      this.updateOverlayStatus('disconnected');
      setTimeout(() => { if (this.token && this.roomId) this.connect(); }, 3000);
    };
  }

  private disconnect() {
    if (this.ws) { this.ws.close(); this.ws = null; }
    if (this.syncInterval) { clearInterval(this.syncInterval); this.syncInterval = null; }
    if (this.overlay) { this.overlay.style.display = 'none'; }
    this.roomId = null;
    this.token = null;
    chrome.storage.local.remove(['token', 'roomId']);
  }

  private startSyncLoop() {
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

  private applySync(event: any) {
    if (!this.video) return;
    if (event.type === 'play' && this.video.paused) this.video.play();
    else if (event.type === 'pause' && !this.video.paused) this.video.pause();
    else if (event.type === 'seek') this.video.currentTime = event.timestamp;
    else if (event.type === 'speed') this.video.playbackRate = event.playback_speed || 1;
  }

  private applyState(state: any) {
    if (!this.video) return;
    if (Math.abs(this.video.currentTime - (state.timestamp || 0)) > 1.5) {
      this.video.currentTime = state.timestamp || 0;
    }
    if (state.playback_state === 'playing' && this.video.paused) this.video.play();
    if (state.playback_state === 'paused' && !this.video.paused) this.video.pause();
    if (state.speed) this.video.playbackRate = state.speed;
  }

  private getState(): VideoState | null {
    if (!this.video) return null;
    return {
      isPlaying: !this.video.paused,
      currentTime: this.video.currentTime,
      duration: this.video.duration,
      playbackRate: this.video.playbackRate,
      episode: this.detectEpisode(),
    };
  }

  private updateOverlayStatus(status: 'connected' | 'disconnected' | 'syncing') {
    if (!this.overlay) return;
    const dot = this.overlay.querySelector('.syncsaga-dot') as HTMLDivElement;
    const text = this.overlay.querySelector('.syncsaga-text') as HTMLSpanElement;
    if (!dot || !text) return;

    if (status === 'connected') {
      dot.style.background = '#10b981';
      text.textContent = 'Synced';
    } else if (status === 'disconnected') {
      dot.style.background = '#ef4444';
      text.textContent = 'Disconnected';
    } else {
      dot.style.background = '#f59e0b';
      text.textContent = 'Syncing...';
    }
  }

  private injectOverlay() {
    if (this.overlay) {
      this.overlay.style.display = 'flex';
      return;
    }

    const overlay = document.createElement('div');
    overlay.innerHTML = `
      <div class="syncsaga-dot" style="width:8px;height:8px;border-radius:50%;background:#ef4444;flex-shrink:0"></div>
      <span class="syncsaga-text" style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">SyncSaga</span>
      <button class="syncsaga-mute-btn" style="background:none;border:none;cursor:pointer;padding:2px;display:flex;align-items:center;opacity:0.7;flex-shrink:0" title="Toggle mic">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
      </button>
      <button class="syncsaga-minimize-btn" style="background:none;border:none;cursor:pointer;padding:2px;display:flex;align-items:center;opacity:0.7;flex-shrink:0" title="Minimize">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    `;
    overlay.style.cssText = `
      position:fixed;bottom:80px;right:20px;z-index:999999;
      display:flex;align-items:center;gap:8px;
      padding:8px 14px;
      background:rgba(10,10,15,0.92);
      backdrop-filter:blur(12px);
      border:1px solid rgba(139,92,246,0.3);
      border-radius:100px;
      color:white;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      font-size:12px;
      box-shadow:0 4px 20px rgba(0,0,0,0.5),0 0 0 1px rgba(139,92,246,0.1);
      cursor:grab;
      user-select:none;
      transition:box-shadow 0.2s,transform 0.2s;
      min-width:120px;
      max-width:240px;
    `;

    const muteBtn = overlay.querySelector('.syncsaga-mute-btn') as HTMLButtonElement;
    muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const svg = muteBtn.querySelector('svg')!;
      const isMuted = svg.innerHTML.includes('M9');
      if (isMuted) {
        svg.innerHTML = '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>';
      } else {
        svg.innerHTML = '<line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>';
      }
    });

    const minimizeBtn = overlay.querySelector('.syncsaga-minimize-btn') as HTMLButtonElement;
    minimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.overlayVisible = !this.overlayVisible;
      const text = overlay.querySelector('.syncsaga-text') as HTMLSpanElement;
      const dot = overlay.querySelector('.syncsaga-dot') as HTMLDivElement;
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
      this.dragOffsetX = e.clientX - overlay.getBoundingClientRect().left;
      this.dragOffsetY = e.clientY - overlay.getBoundingClientRect().top;
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
}

new SyncSagaContentScript();
