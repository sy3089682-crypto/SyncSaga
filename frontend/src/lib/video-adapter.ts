/**
 * Video Adapter Layer
 *
 * Normalizes video playback across different streaming sources:
 * - Direct HTML5 video
 * - HLS streams (via hls.js)
 * - iframe-embedded sources (HiAnime, 9anime, etc.)
 * - Local files
 *
 * Each adapter provides a consistent API: play, pause, seek, getTime, getDuration, onTimeUpdate
 */

export interface VideoAdapter {
  play(): Promise<void>
  pause(): void
  seek(time: number): void
  getTime(): number
  getDuration(): number
  getPlaybackRate(): number
  setPlaybackRate(rate: number): void
  getVolume(): number
  setVolume(vol: number): void
  isPaused(): boolean
  onTimeUpdate(cb: (time: number) => void): () => void
  onPlay(cb: () => void): () => void
  onPause(cb: () => void): () => void
  onSeeked(cb: () => void): () => void
  onBuffering(cb: (isBuffering: boolean) => void): () => void
  destroy(): void
}

export class HTML5VideoAdapter implements VideoAdapter {
  private video: HTMLVideoElement
  private timeListeners = new Set<(time: number) => void>()
  private playListeners = new Set<() => void>()
  private pauseListeners = new Set<() => void>()
  private seekedListeners = new Set<() => void>()
  private bufferingListeners = new Set<(isBuffering: boolean) => void>()
  private isBuffering = false
  private bufferingTimer: ReturnType<typeof setTimeout> | null = null

  constructor(videoElement: HTMLVideoElement) {
    this.video = videoElement
    this.attachEvents()
  }

  private attachEvents() {
    this.video.addEventListener('timeupdate', () => {
      this.timeListeners.forEach((cb) => cb(this.video.currentTime))
    })
    this.video.addEventListener('play', () => {
      this.playListeners.forEach((cb) => cb())
    })
    this.video.addEventListener('pause', () => {
      this.pauseListeners.forEach((cb) => cb())
    })
    this.video.addEventListener('seeked', () => {
      this.seekedListeners.forEach((cb) => cb())
    })
    this.video.addEventListener('waiting', () => {
      this.isBuffering = true
      this.bufferingListeners.forEach((cb) => cb(true))
    })
    this.video.addEventListener('canplay', () => {
      if (this.isBuffering) {
        this.isBuffering = false
        this.bufferingListeners.forEach((cb) => cb(false))
      }
    })
    this.video.addEventListener('stalled', () => {
      this.bufferingListeners.forEach((cb) => cb(true))
    })
  }

  async play() { await this.video.play() }
  pause() { this.video.pause() }
  seek(time: number) { this.video.currentTime = time }
  getTime() { return this.video.currentTime }
  getDuration() { return this.video.duration || 0 }
  getPlaybackRate() { return this.video.playbackRate }
  setPlaybackRate(rate: number) { this.video.playbackRate = rate }
  getVolume() { return this.video.volume }
  setVolume(vol: number) { this.video.volume = vol }
  isPaused() { return this.video.paused }

  onTimeUpdate(cb: (time: number) => void) {
    this.timeListeners.add(cb)
    return () => this.timeListeners.delete(cb)
  }
  onPlay(cb: () => void) {
    this.playListeners.add(cb)
    return () => this.playListeners.delete(cb)
  }
  onPause(cb: () => void) {
    this.pauseListeners.add(cb)
    return () => this.pauseListeners.delete(cb)
  }
  onSeeked(cb: () => void) {
    this.seekedListeners.add(cb)
    return () => this.seekedListeners.delete(cb)
  }
  onBuffering(cb: (isBuffering: boolean) => void) {
    this.bufferingListeners.add(cb)
    return () => this.bufferingListeners.delete(cb)
  }

  destroy() {
    this.timeListeners.clear()
    this.playListeners.clear()
    this.pauseListeners.clear()
    this.seekedListeners.clear()
    this.bufferingListeners.clear()
  }
}

export class HLSVideoAdapter implements VideoAdapter {
  private video: HTMLVideoElement
  private hls: any = null
  private timeListeners = new Set<(time: number) => void>()
  private playListeners = new Set<() => void>()
  private pauseListeners = new Set<() => void>()
  private seekedListeners = new Set<() => void>()
  private bufferingListeners = new Set<(isBuffering: boolean) => void>()
  private isBuffering = false

  constructor(videoElement: HTMLVideoElement, src: string) {
    this.video = videoElement
    this.initHLS(src)
    this.attachEvents()
  }

  private async initHLS(src: string) {
    try {
      const Hls = (await import('hls.js')).default
      if (Hls.isSupported()) {
        this.hls = new Hls()
        this.hls.loadSource(src)
        this.hls.attachMedia(this.video)
      } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
        this.video.src = src
      }
    } catch {
      this.video.src = src
    }
  }

  private attachEvents() {
    this.video.addEventListener('timeupdate', () => {
      this.timeListeners.forEach((cb) => cb(this.video.currentTime))
    })
    this.video.addEventListener('play', () => this.playListeners.forEach((cb) => cb()))
    this.video.addEventListener('pause', () => this.pauseListeners.forEach((cb) => cb()))
    this.video.addEventListener('seeked', () => this.seekedListeners.forEach((cb) => cb()))
    this.video.addEventListener('waiting', () => {
      this.isBuffering = true
      this.bufferingListeners.forEach((cb) => cb(true))
    })
    this.video.addEventListener('canplay', () => {
      if (this.isBuffering) {
        this.isBuffering = false
        this.bufferingListeners.forEach((cb) => cb(false))
      }
    })
  }

  async play() { await this.video.play() }
  pause() { this.video.pause() }
  seek(time: number) { this.video.currentTime = time }
  getTime() { return this.video.currentTime }
  getDuration() { return this.video.duration || 0 }
  getPlaybackRate() { return this.video.playbackRate }
  setPlaybackRate(rate: number) { this.video.playbackRate = rate }
  getVolume() { return this.video.volume }
  setVolume(vol: number) { this.video.volume = vol }
  isPaused() { return this.video.paused }

  onTimeUpdate(cb: (time: number) => void) { this.timeListeners.add(cb); return () => this.timeListeners.delete(cb) }
  onPlay(cb: () => void) { this.playListeners.add(cb); return () => this.playListeners.delete(cb) }
  onPause(cb: () => void) { this.pauseListeners.add(cb); return () => this.pauseListeners.delete(cb) }
  onSeeked(cb: () => void) { this.seekedListeners.add(cb); return () => this.seekedListeners.delete(cb) }
  onBuffering(cb: (isBuffering: boolean) => void) {
    this.bufferingListeners.add(cb)
    return () => this.bufferingListeners.delete(cb)
  }

  destroy() {
    this.hls?.destroy()
    this.timeListeners.clear()
    this.playListeners.clear()
    this.pauseListeners.clear()
    this.seekedListeners.clear()
    this.bufferingListeners.clear()
  }
}

export class IframeBridgeAdapter implements VideoAdapter {
  private iframe: HTMLIFrameElement
  private time = 0
  private duration = 0
  private rate = 1
  private paused = true
  private timeListeners = new Set<(time: number) => void>()
  private playListeners = new Set<() => void>()
  private pauseListeners = new Set<() => void>()
  private _pollTimer: ReturnType<typeof setInterval> | null = null
  private _messageHandler: ((e: MessageEvent) => void) | null = null

  constructor(iframeElement: HTMLIFrameElement, origin: string) {
    this.iframe = iframeElement
    this.setupBridge(origin)
    this.startPolling()
  }

  private setupBridge(origin: string) {
    this._messageHandler = (e: MessageEvent) => {
      if (e.origin !== origin && origin !== '*') return
      const data = e.data
      if (typeof data !== 'object') return
      if (data.type === 'syncsaga_state') {
        this.time = data.currentTime ?? this.time
        this.duration = data.duration ?? this.duration
        this.paused = data.paused ?? this.paused
        this.rate = data.playbackRate ?? this.rate
        this.timeListeners.forEach((cb) => cb(this.time))
      }
    }
    window.addEventListener('message', this._messageHandler)
  }

  private startPolling() {
    this._pollTimer = setInterval(() => {
      this.postMessage({ type: 'syncsaga_poll' })
    }, 500)
  }

  private postMessage(msg: any) {
    try {
      this.iframe.contentWindow?.postMessage(msg, '*')
    } catch {}
  }

  async play() {
    this.postMessage({ type: 'syncsaga_play' })
    this.paused = false
    this.playListeners.forEach((cb) => cb())
  }
  pause() {
    this.postMessage({ type: 'syncsaga_pause' })
    this.paused = true
    this.pauseListeners.forEach((cb) => cb())
  }
  seek(time: number) {
    this.postMessage({ type: 'syncsaga_seek', time })
    this.time = time
  }
  getTime() { return this.time }
  getDuration() { return this.duration }
  getPlaybackRate() { return this.rate }
  setPlaybackRate(rate: number) {
    this.postMessage({ type: 'syncsaga_rate', rate })
    this.rate = rate
  }
  getVolume() { return 1 }
  setVolume(vol: number) { this.postMessage({ type: 'syncsaga_volume', vol }) }
  isPaused() { return this.paused }

  onTimeUpdate(cb: (time: number) => void) { this.timeListeners.add(cb); return () => this.timeListeners.delete(cb) }
  onPlay(cb: () => void) { this.playListeners.add(cb); return () => this.playListeners.delete(cb) }
  onPause(cb: () => void) { this.pauseListeners.add(cb); return () => this.pauseListeners.delete(cb) }
  onSeeked(cb: () => void) { return () => {} }
  onBuffering(cb: (isBuffering: boolean) => void) { return () => {} }

  destroy() {
    if (this._pollTimer) clearInterval(this._pollTimer)
    if (this._messageHandler) window.removeEventListener('message', this._messageHandler)
    this.timeListeners.clear()
    this.playListeners.clear()
    this.pauseListeners.clear()
  }
}

export function detectSourceType(url: string): 'direct' | 'hls' | 'iframe' | 'unknown' {
  if (!url) return 'unknown'
  if (url.includes('.m3u8')) return 'hls'
  if (url.match(/^(https?:\/\/).*(hianime|9anime|gogoanime|animepahe|zoro)/i)) return 'iframe'
  if (url.match(/\.(mp4|webm|mkv|avi|mov)$/i)) return 'direct'
  return 'unknown'
}

export function createAdapter(videoElement: HTMLVideoElement, url: string, iframe?: HTMLIFrameElement): VideoAdapter {
  const type = detectSourceType(url)
  switch (type) {
    case 'hls':
      return new HLSVideoAdapter(videoElement, url)
    case 'iframe':
      if (iframe) return new IframeBridgeAdapter(iframe, '*')
      return new HTML5VideoAdapter(videoElement)
    default:
      return new HTML5VideoAdapter(videoElement)
  }
}
