'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { useRoomStore } from '@/store/room'
import { syncSocket } from '@/lib/ws'
import { api } from '@/lib/api'
import { CinemaPlayer } from '@/components/cinema/CinemaPlayer'
import { SyncOverlay } from '@/components/cinema/SyncOverlay'
import { Timeline } from '@/components/room/Timeline'
import { ReactionBar } from '@/components/room/ReactionBar'
import { ParticipantList } from '@/components/room/ParticipantList'
import { ClipCapture } from '@/components/room/ClipCapture'
import type { SyncState, User, Reaction, Clip } from '@/types'

export default function RoomPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const { currentRoom, participants, syncState, setRoom, setParticipants, setSyncState, isJoined, join, leave } = useRoomStore()
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [clips, setClips] = useState<Clip[]>([])
  const [isTheater, setIsTheater] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (!user) { router.push('/auth'); return }
    if (!id) return

    const loadRoom = async () => {
      try {
        const room = await api.get<import('@/types').Room>(`/api/rooms/${id}`)
        setRoom(room)
        if (!isJoined) {
          await api.post<{ joined: boolean }>(`/api/rooms/${id}/join`)
          useRoomStore.setState({ isJoined: true })
        }
      } catch {
        router.push('/dashboard')
      }
    }

    loadRoom()

    syncSocket.connect(id, useAuthStore.getState().token || '')

    const unsubSync = syncSocket.onSyncState((state) => {
      setSyncState(state)
      setSyncing(false)
    })

    const unsubReaction = syncSocket.onReaction((reaction) => {
      setReactions((prev) => [...prev.slice(-49), reaction])
    })

    const unsubJoined = syncSocket.onUserJoined((u: User) => {
      setParticipants([...participants, u])
    })

    const unsubLeft = syncSocket.onUserLeft((u: User) => {
      setParticipants(participants.filter((p) => p.id !== u.id))
    })

    return () => {
      unsubSync()
      unsubReaction()
      unsubJoined()
      unsubLeft()
      syncSocket.disconnect()
    }
  }, [id, user])

  const handlePlay = useCallback(() => syncSocket.sendSyncEvent({ event_type: 'play' }), [])
  const handlePause = useCallback(() => syncSocket.sendSyncEvent({ event_type: 'pause' }), [])
  const handleSeek = useCallback((time: number) => syncSocket.sendSyncEvent({ event_type: 'seek', media_timestamp: time }), [])
  const handleReaction = useCallback((emoji: string) => syncSocket.sendReaction(emoji), [])
  const handleResync = useCallback(async () => {
    setSyncing(true)
    await api.post<import('@/types').DetectionResult>(`/api/sync/${id}/resync`)
  }, [id])

  if (!user || !currentRoom) return null

  return (
    <div className={`min-h-screen ${isTheater ? 'pt-0 bg-black' : 'pt-14'}`}>
      <div className={`${isTheater ? '' : 'max-w-7xl mx-auto px-4 py-6'}`}>
        {!isTheater && (
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">{currentRoom.name}</h1>
              {currentRoom.media_title && (
                <p className="text-sm text-surface-400">
                  {currentRoom.media_title}{currentRoom.episode ? ` - Ep. ${currentRoom.episode}` : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsTheater(true)} className="btn-secondary text-sm">
                Theater Mode
              </button>
              <button onClick={handleResync} className="btn-secondary text-sm" disabled={syncing}>
                {syncing ? 'Resyncing...' : 'Resync'}
              </button>
              <button onClick={() => { leave(id); router.push('/dashboard') }} className="btn-danger text-sm">
                Leave
              </button>
            </div>
          </div>
        )}

        {isTheater && (
          <button onClick={() => setIsTheater(false)} className="fixed top-4 left-4 z-50 btn-ghost text-sm">
            Exit Theater
          </button>
        )}

        <div className={`flex gap-6 ${isTheater ? 'theater-layout' : ''}`}>
          <div className={`${isTheater ? 'flex-1' : 'w-full lg:w-3/4'}`}>
            <div className={`relative ${isTheater ? 'h-screen' : 'aspect-video rounded-xl overflow-hidden glass'}`}>
              <CinemaPlayer
                mediaUrl={currentRoom.media_url}
                syncState={syncState}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
                isTheater={isTheater}
              />
              <SyncOverlay syncState={syncState} />
            </div>

            {!isTheater && (
              <>
                <ReactionBar onReact={handleReaction} recentReactions={reactions} />
                <Timeline
                  roomId={id}
                  syncState={syncState}
                  onSeek={handleSeek}
                />
                <ClipCapture roomId={id} syncState={syncState} />
              </>
            )}
          </div>

          {!isTheater && (
            <div className="hidden lg:block w-1/4 space-y-4">
              <ParticipantList participants={participants} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
