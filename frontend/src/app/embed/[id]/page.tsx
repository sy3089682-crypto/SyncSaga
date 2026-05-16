'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import type { Room, SyncState } from '@/types'
import { syncSocket } from '@/lib/ws'

export default function EmbedPage() {
  const { id } = useParams<{ id: string }>()
  const [room, setRoom] = useState<Room | null>(null)
  const [syncState, setSyncState] = useState<SyncState | null>(null)

  useEffect(() => {
    if (!id) return
    api.get<Room>(`/api/rooms/${id}`).then(setRoom).catch(() => {})
  }, [id])

  useEffect(() => {
    if (!id) return
    const token = new URLSearchParams(window.location.search).get('token') || ''
    syncSocket.connect(id, token)
    const unsub = syncSocket.onSyncState((state) => setSyncState(state))
    return () => { unsub(); syncSocket.disconnect() }
  }, [id])

  return (
    <div className="w-full h-screen bg-black flex items-center justify-center">
      {room ? (
        <div className="text-center">
          <p className="text-white font-semibold">{room.name}</p>
          {syncState && (
            <p className="text-white/60 text-sm mt-1">
              {syncState.is_playing ? '▶ Playing' : '⏸ Paused'}
            </p>
          )}
        </div>
      ) : (
        <p className="text-white/40">Loading embed...</p>
      )}
    </div>
  )
}
