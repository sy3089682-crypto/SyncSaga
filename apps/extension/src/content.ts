import { audioFingerprinter } from './audio/fingerprinter';

interface ExtensionMessage {
  type: 'CONNECT' | 'DISCONNECT' | 'GET_STATE' | 'VIDEO_DETECTED' | 'VIDEO_STATE' | 'START_FINGERPRINT' | 'FINGERPRINT_RESULT';
  payload?: any;
}

interface VideoState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  episode: string | null;
}

class SyncSagaContentScript {
  private video: HTMLVideoElement | null = null;
  private ws: WebSocket | null = null;
  private roomId: string | null = null;
  private token: string | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private lastSyncTime: number = 0;
  private observer: MutationObserver | null = null;
  private overlay: HTMLButtonElement | null = null;
  private isFingerprinting: boolean = false;

  constructor() {
    chrome.storage.local.get(['token', 'roomId'], (result) => {
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
        case 'START_FINGERPRINT':
          this.startFingerprintCapture();
          break;
      }
    });
  }

  private detectVideo() {
    const video = document.querySelector('video');
    if (video && video !== this.video) {
      this.video = video;
      this.bindVideoEvents();
      this.injectOverlay();
      chrome.runtime.sendMessage({ type: 'VIDEO_DETECTED', payload: { hasVideo: true } });
    }
  }

  private watchDom() {
    this.observer = new MutationObserver(() => this.detectVideo());
    this.observer.observe(document.body, { childList: true, subtree: true });
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
    const patterns = [
      () => (window.location.pathname.match(/\/episode[s]?\/(\d+)/i) || [])[1],
      () => {
        for (const sel of ['[class*="episode"]', '[id*="episode"]', 'h1', 'h2']) {
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
    const wsUrl = 'ws://localhost:4000/ws';
    this.ws = new WebSocket(`${wsUrl}?token=${this.token}`);

    this.ws.onopen = () => {
      this.ws!.send(JSON.stringify({ type: 'ROOM_JOIN', payload: { roomId: this.roomId } }));
      this.startSyncLoop();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'SYNC_EVENT') this.applySync(msg.payload);
        if (msg.type === 'SYNC_STATE') this.applyState(msg.payload);
        if (msg.type === 'REQUEST_FINGERPRINT') this.startFingerprintCapture();
      } catch {}
    };

    this.ws.onclose = () => {
      setTimeout(() => { if (this.token && this.roomId) this.connect(); }, 3000);
    };
  }

  private disconnect() {
    if (this.ws) { this.ws.close(); this.ws = null; }
    if (this.syncInterval) { clearInterval(this.syncInterval); this.syncInterval = null; }
    audioFingerprinter.stop();
    this.isFingerprinting = false;
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

  private injectOverlay() {
    if (this.overlay) return;
    this.overlay = document.createElement('button');
    this.overlay.textContent = '◇ SyncSaga';
    Object.assign(this.overlay.style, {
      position: 'fixed', top: '12px', right: '12px', zIndex: '999999',
      padding: '8px 16px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
      fontSize: '14px', fontWeight: '600', boxShadow: '0 4px 12px rgba(139,92,246,0.4)',
      transition: 'transform 0.2s, box-shadow 0.2s',
    });
    this.overlay.onmouseenter = () => { this.overlay!.style.transform = 'scale(1.05)'; };
    this.overlay.onmouseleave = () => { this.overlay!.style.transform = 'scale(1)'; };
    
    // Add fingerprint capture button on right-click or shift+click
    this.overlay.onclick = (e) => {
      if (e.shiftKey) {
        this.startFingerprintCapture();
      }
    };
    this.overlay.title = 'Click to open SyncSaga | Shift+Click to identify episode';
    
    document.body.appendChild(this.overlay);
  }

  private async startFingerprintCapture() {
    if (!this.video || this.isFingerprinting) return;
    
    this.isFingerprinting = true;
    console.log('Starting audio fingerprint capture...');
    
    // Show loading indicator
    if (this.overlay) {
      this.overlay.textContent = '⟳ Identifying...';
      this.overlay.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
    }
    
    try {
      // Start audio capture
      const started = await audioFingerprinter.start(this.video);
      
      if (!started) {
        throw new Error('Failed to start audio capture');
      }
      
      // Capture for 3 seconds
      const { fingerprints, duration } = await audioFingerprinter.captureForDuration(3000);
      
      if (fingerprints.length === 0) {
        throw new Error('No fingerprints captured');
      }
      
      // Send to backend for matching
      const response = await fetch('http://localhost:8000/api/ai/match-episode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_base64: btoa(String.fromCharCode(...new Uint8Array(
            new Float32Array(fingerprints.map(f => f * 32768)).buffer)
          )),
          duration_sec: duration,
          source_url: window.location.href
        })
      });
      
      const result = await response.json();
      
      if (result.matched) {
        console.log(`Matched: ${result.title} Episode ${result.episode_number}`);
        chrome.runtime.sendMessage({
          type: 'FINGERPRINT_RESULT',
          payload: {
            matched: true,
            anime: result.title,
            episode: result.episode_number,
            offset: result.offset_seconds,
            confidence: result.confidence
          }
        });
        
        // Update overlay
        if (this.overlay) {
          this.overlay.textContent = `✓ ${result.title} Ep${result.episode_number}`;
          this.overlay.style.background = 'linear-gradient(135deg, #10b981, #059669)';
          
          setTimeout(() => {
            if (this.overlay) {
              this.overlay.textContent = '◇ SyncSaga';
              this.overlay.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
            }
          }, 3000);
        }
      } else {
        throw new Error('No match found');
      }
      
    } catch (error) {
      console.error('Fingerprint capture failed:', error);
      chrome.runtime.sendMessage({
        type: 'FINGERPRINT_RESULT',
        payload: { matched: false, error: error.message }
      });
      
      if (this.overlay) {
        this.overlay.textContent = '✗ Not Found';
        this.overlay.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        
        setTimeout(() => {
          if (this.overlay) {
            this.overlay.textContent = '◇ SyncSaga';
            this.overlay.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
          }
        }, 2000);
      }
    } finally {
      this.isFingerprinting = false;
    }
  }
}

new SyncSagaContentScript();
