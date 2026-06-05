import { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'

function Popup() {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [roomUrl, setRoomUrl] = useState('')
  const [token, setToken] = useState('')

  useEffect(() => {
    chrome.storage.local.get(['token', 'roomId', 'connected'], (data) => {
      if (data.token) setToken(data.token)
      if (data.connected) setStatus('connected')
    })
  }, [])

  const connect = async () => {
    if (!roomUrl.trim()) return
    const roomId = roomUrl.split('/room/')[1]?.split('?')[0]
    if (!roomId) { alert('Invalid room URL'); return }
    setStatus('connecting')
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    chrome.tabs.sendMessage(tab.id!, { type: 'CONNECT', token, roomId })
    chrome.storage.local.set({ roomId, connected: true })
    setStatus('connected')
  }

  const disconnect = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    chrome.tabs.sendMessage(tab.id!, { type: 'DISCONNECT' })
    chrome.storage.local.remove(['roomId', 'connected'])
    setStatus('disconnected')
  }

  return (
    <div style={{ width: 300, padding: 16, background: '#0a0a0a', color: 'white', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ color: '#00d4ff', fontWeight: 900, fontSize: 18 }}>⚡ SyncSaga</span>
        <span style={{
          fontSize: 10, padding: '2px 8px',
          background: status === 'connected' ? '#00d4ff20' : '#1a1a1a',
          color: status === 'connected' ? '#00d4ff' : '#444',
          textTransform: 'uppercase', letterSpacing: 1,
        }}>{status}</span>
      </div>

      {status === 'disconnected' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            value={roomUrl} onChange={e => setRoomUrl(e.target.value)}
            placeholder="Paste room URL..."
            style={{ background: '#111', border: '1px solid #1a1a1a', color: 'white', padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }}
          />
          <button onClick={connect}
            style={{ background: '#00d4ff', color: 'black', border: 'none', padding: '10px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            Connect to Room
          </button>
          <p style={{ fontSize: 11, color: '#444', margin: 0 }}>Login at syncsaga.app first to get your token auto-filled.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ background: '#111', border: '1px solid #00d4ff20', padding: 12, fontSize: 12, color: '#00d4ff' }}>
            ✓ Syncing with room
          </div>
          <button onClick={disconnect}
            style={{ background: 'transparent', color: '#ff006e', border: '1px solid #ff006e', padding: '10px', cursor: 'pointer', fontSize: 13 }}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<Popup/>)
