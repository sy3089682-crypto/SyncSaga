import type { WSMessage, SyncState, Reaction, User, SyncEvent } from '@/types'

type WSCallback = (msg: WSMessage) => void

class SyncSocket {
  private ws: WebSocket | null = null
  private url: string | null = null
  private listeners = new Map<string, Set<WSCallback>>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private roomId: string | null = null

  connect(roomId: string, token: string) {
    this.roomId = roomId
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'
    this.url = `${baseUrl}/ws/${roomId}?token=${token}`
    this.createConnection()
  }

  private createConnection() {
    if (!this.url) return
    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }
    }

    this.ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        const typeListeners = this.listeners.get(msg.type)
        if (typeListeners) {
          typeListeners.forEach((cb) => cb(msg))
        }
        const allListeners = this.listeners.get('*')
        if (allListeners) {
          allListeners.forEach((cb) => cb(msg))
        }
      } catch {
        // ignore parse errors
      }
    }

    this.ws.onclose = () => {
      if (this.roomId) {
        this.reconnectTimer = setTimeout(() => this.createConnection(), 3000)
      }
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  send(type: string, payload: Record<string, unknown> = {}) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload, timestamp: new Date().toISOString() }))
    }
  }

  on(type: string, cb: WSCallback) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type)!.add(cb)
    return () => this.listeners.get(type)?.delete(cb)
  }

  onSyncState(cb: (state: SyncState) => void) {
    return this.on('sync_state', (msg) => cb(msg.payload as unknown as SyncState))
  }

  onReaction(cb: (reaction: Reaction) => void) {
    return this.on('reaction', (msg) => cb(msg.payload as unknown as Reaction))
  }

  onUserJoined(cb: (user: User) => void) {
    return this.on('user_joined', (msg) => cb(msg.payload as unknown as User))
  }

  onUserLeft(cb: (user: User) => void) {
    return this.on('user_left', (msg) => cb(msg.payload as unknown as User))
  }

  sendSyncEvent(event: Partial<SyncEvent>) {
    this.send('sync_event', event as unknown as Record<string, unknown>)
  }

  sendReaction(emoji: string, sceneId?: string) {
    this.send('reaction', { emoji, scene_id: sceneId })
  }

  sendChat(message: string) {
    this.send('chat', { message })
  }

  disconnect() {
    this.roomId = null
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
  }
}

export const syncSocket = new SyncSocket()
