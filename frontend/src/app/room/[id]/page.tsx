'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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
import { CinematicLoading } from '@/components/ui/CinematicLoading'
import { useFloatingEmojis, FloatingEmojisRenderer, EmojiBurstButton } from '@/components/room/FloatingEmojis'
import type { SyncState, User, Reaction, Clip } from '@/types'
import { Maximize2, Minimize2, ArrowLeft, RefreshCw, LogOut } from 'lucide-react'

export default function RoomPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const { currentRoom, participants, syncState, setRoom, setParticipants, setSyncState, isJoined } = useRoomStore()
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [clips, setClips] = useState<Clip[]>([])
  const [isTheater, setIsTheater] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const { emojis, addEmoji } = useFloatingEmojis()
  const reactionCountdownRef = useRef<ReturnType<typeof setTimeout>>()

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
      } finally {
        setTimeout(() => setLoading(false), 600)
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
      addEmoji(reaction.emoji)
    })

    const unsubJoined = syncSocket.onUserJoined((u: User) => {
      setParticipants((prev: User[]) => [...prev, u])
    })

    const unsubLeft = syncSocket.onUserLeft((u: User) => {
      setParticipants((prev: User[]) => prev.filter((p) => p.id !== u.id))
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
  const handleReaction = useCallback((emoji: string) => {
    syncSocket.sendReaction(emoji)
    addEmoji(emoji)

    if (reactionCountdownRef.current) clearTimeout(reactionCountdownRef.current)
    for (let i = 0; i < 3; i++) {
      reactionCountdownRef.current = setTimeout(() => addEmoji(emoji), i * 100)
    }
  }, [addEmoji])

  const handleBurst = useCallback(() => {
    const burstEmojis = ['🔥', '💀', '🎉', '⚡', '💥']
    burstEmojis.forEach((e, i) => {
      setTimeout(() => {
        syncSocket.sendReaction(e)
        addEmoji(e)
      }, i * 80)
    })
  }, [addEmoji])

  const handleResync = useCallback(async () => {
    setSyncing(true)
    try { await api.post<import('@/types').DetectionResult>(`/api/sync/${id}/resync`) }
    catch { setSyncing(false) }
  }, [id])

  if (loading) return <CinematicLoading message="Joining watch room..." />
  if (!user || !currentRoom) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`min-h-screen relative ${isTheater ? 'pt-0 bg-black' : 'pt-14'}`}
    >
      <div className={`${isTheater ? '' : 'max-w-7xl mx-auto px-4 py-6'}`}>
        {!isTheater && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/dashboard')}
                className="btn-ghost p-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
              </motion.button>
              <div>
                <h1 className="text-xl font-bold">{currentRoom.name}</h1>
                {currentRoom.media_title && (
                  <p className="text-sm text-surface-400">
                    {currentRoom.media_title}{currentRoom.episode ? ` - Ep. ${currentRoom.episode}` : ''}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <EmojiBurstButton onBurst={handleBurst} />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsTheater(true)}
                className="btn-secondary text-sm flex items-center gap-1"
              >
                <Maximize2 className="w-3 h-3" /> Theater
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleResync}
                className="btn-secondary text-sm flex items-center gap-1"
                disabled={syncing}
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Resyncing' : 'Resync'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { useRoomStore.getState().leave(id); router.push('/dashboard') }}
                className="btn-danger text-sm flex items-center gap-1"
              >
                <LogOut className="w-3 h-3" /> Leave
              </motion.button>
            </div>
          </motion.div>
        )}

        {isTheater && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            whileHover={{ opacity: 1 }}
            onClick={() => setIsTheater(false)}
            className="fixed top-4 left-4 z-50 btn-ghost text-sm flex items-center gap-1"
          >
            <Minimize2 className="w-3 h-3" /> Exit Theater
          </motion.button>
        )}

        <div className={`flex gap-6 ${isTheater ? 'theater-layout' : ''}`}>
          <div className={`${isTheater ? 'flex-1' : 'w-full lg:w-3/4'}`}>
            <motion.div
              layout
              className={`relative ${isTheater ? 'h-screen' : 'aspect-video rounded-xl overflow-hidden glass'}`}
            >
              <AnimatePresence>
                <FloatingEmojisRenderer emojis={emojis} />
              </AnimatePresence>

              <CinemaPlayer
                mediaUrl={currentRoom.media_url}
                syncState={syncState}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
                isTheater={isTheater}
              />
              <SyncOverlay syncState={syncState} />
            </motion.div>

            {!isTheater && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <ReactionBar onReact={handleReaction} recentReactions={reactions} />
                <Timeline roomId={id} syncState={syncState} onSeek={handleSeek} />
                <ClipCapture roomId={id} syncState={syncState} />
              </motion.div>
            )}
          </div>

          {!isTheater && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="hidden lg:block w-1/4 space-y-4"
            >
              <ParticipantList participants={participants} />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
