// SyncSaga Content Script — detects video players and sends sync events
import { io, Socket } from 'socket.io-client'

interface SyncMessage {
  type: 'SYNC_PLAY' | 'SYNC_PAUSE' | 'SYNC_SEEK' | 'CONNECT' | 'DISCONNECT'
  timestamp?: number
  roomId?: string
  token?: string
}

let socket: Socket | null = null
let video: HTMLVideoElement | null = null
let roomId: string | null = null
let isHost = false
let isSyncing = false

const SYNC_DEBOUNCE_MS = 300

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

function findVideo(): HTMLVideoElement | null {
  const videos = document.querySelectorAll('video')
  // Prefer largest video element
  let best: HTMLVideoElement | null = null
  let maxArea = 0
  videos.forEach(v => {
    const area = v.offsetWidth * v.offsetHeight
    if (area > maxArea) { maxArea = area; best = v }
  })
  return best
}

function attachVideoListeners(v: HTMLVideoElement) {
  const onPlay = debounce(() => {
    if (isSyncing || !isHost || !roomId) return
    socket?.emit('sync:event', { room_id: roomId, user_id: '', type: 'play', timestamp: v.currentTime })
  }, SYNC_DEBOUNCE_MS)

  const onPause = debounce(() => {
    if (isSyncing || !isHost || !roomId) return
    socket?.emit('sync:event', { room_id: roomId, user_id: '', type: 'pause', timestamp: v.currentTime })
  }, SYNC_DEBOUNCE_MS)

  const onSeeked = debounce(() => {
    if (isSyncing || !isHost || !roomId) return
    socket?.emit('sync:event', { room_id: roomId, user_id: '', type: 'seek', timestamp: v.currentTime })
  }, SYNC_DEBOUNCE_MS)

  v.addEventListener('play', onPlay)
  v.addEventListener('pause', onPause)
  v.addEventListener('seeked', onSeeked)
}

function applySyncState(timestamp: number, playing: boolean) {
  if (!video) return
  isSyncing = true
  const drift = Math.abs(video.currentTime - timestamp)
  if (drift > 1) video.currentTime = timestamp
  if (playing && video.paused) video.play().catch(() => {})
  if (!playing && !video.paused) video.pause()
  setTimeout(() => { isSyncing = false }, 500)
}

function connectSocket(token: string, rId: string, hostFlag: boolean) {
  if (socket?.connected) socket.disconnect()
  roomId = rId
  isHost = hostFlag

  socket = io('http://localhost:4000', {
    auth: { token },
    transports: ['websocket'],
  })

  socket.on('connect', () => {
    socket!.emit('room:join', { roomId: rId })
    chrome.runtime.sendMessage({ type: 'SOCKET_STATUS', status: 'connected' })
  })

  socket.on('sync:event', (event) => {
    if (isHost) return // hosts don't receive their own events
    applySyncState(event.timestamp, event.type === 'play')
  })

  socket.on('sync:state', (state) => {
    applySyncState(state.timestamp, state.playback_state === 'playing')
  })

  socket.on('disconnect', () => {
    chrome.runtime.sendMessage({ type: 'SOCKET_STATUS', status: 'disconnected' })
  })

  video = findVideo()
  if (video) attachVideoListeners(video)

  // Observe DOM for late-loading videos
  const observer = new MutationObserver(() => {
    if (!video || !document.contains(video)) {
      video = findVideo()
      if (video) attachVideoListeners(video)
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

chrome.runtime.onMessage.addListener((msg: SyncMessage) => {
  if (msg.type === 'CONNECT' && msg.token && msg.roomId) {
    connectSocket(msg.token, msg.roomId, false)
  } else if (msg.type === 'DISCONNECT') {
    socket?.emit('room:leave', { roomId })
    socket?.disconnect()
    socket = null; roomId = null
  }
})

// Show floating indicator
const indicator = document.createElement('div')
indicator.id = 'syncsaga-indicator'
indicator.style.cssText = `
  position: fixed; bottom: 20px; right: 20px; z-index: 999999;
  background: #111; border: 1px solid #1a1a1a; padding: 8px 12px;
  font-family: monospace; font-size: 12px; color: #00d4ff;
  pointer-events: none; opacity: 0; transition: opacity 0.3s;
`
indicator.textContent = '⚡ SyncSaga'
document.body.appendChild(indicator)

chrome.runtime.onMessage.addListener((msg: any) => {
  if (msg.type === 'SOCKET_STATUS') {
    indicator.textContent = msg.status === 'connected' ? '⚡ SyncSaga Connected' : '⚡ SyncSaga Offline'
    indicator.style.opacity = '1'
    setTimeout(() => { indicator.style.opacity = '0' }, 3000)
  }
})
