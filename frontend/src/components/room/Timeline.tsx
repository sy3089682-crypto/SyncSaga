'use client'

import { useEffect, useRef, useState } from 'react'
import { sync } from '@/lib/api'
import type { SyncState, SceneInfo } from '@/types'
import { Scissors } from 'lucide-react'

interface TimelineProps {
  roomId: string
  syncState: SyncState | null
  onSeek: (time: number) => void
}

export function Timeline({ roomId, syncState, onSeek }: TimelineProps) {
  const [scenes, setScenes] = useState<SceneInfo[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const timelineRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>()

  useEffect(() => {
    sync.getState(roomId).then((state) => {
      setCurrentTime(state.media_timestamp)
    }).catch(() => {})
  }, [roomId])

  useEffect(() => {
    if (!syncState?.is_playing) return
    const startTime = syncState.media_timestamp
    const start = performance.now()

    const tick = () => {
      const elapsed = (performance.now() - start) / 1000 * (syncState.playback_rate || 1)
      setCurrentTime(startTime + elapsed)
      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
  }, [syncState])

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !syncState?.media_timestamp) return
    const rect = timelineRef.current.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    const time = pos * 120
    onSeek(time)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const maxTime = Math.max(currentTime + 30, 120)
  const progress = Math.min(currentTime / maxTime, 1)

  if (!syncState) return null

  return (
    <div className="card mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-surface-200">Timeline</h3>
        <span className="text-xs text-surface-500 font-mono">{formatTime(currentTime)}</span>
      </div>

      <div
        ref={timelineRef}
        className="relative h-8 bg-surface-800 rounded-lg cursor-pointer overflow-hidden group"
        onClick={handleClick}
      >
        <div
          className="h-full bg-brand-600/30 rounded-lg transition-all duration-100"
          style={{ width: `${progress * 100}%` }}
        />

        {scenes.map((scene) => (
          <div
            key={scene.id}
            className="absolute top-0 bottom-0 w-0.5 bg-accent-500/50 hover:bg-accent-400 transition-colors z-10"
            style={{ left: `${(scene.start_time / maxTime) * 100}%` }}
            title={`Scene ${scene.scene_number}`}
          />
        ))}

        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-brand-400 rounded-full shadow-lg shadow-brand-500/50 transition-transform hover:scale-150 -ml-1.5 z-20"
          style={{ left: `${progress * 100}%` }}
        />
      </div>

      <div className="flex items-center gap-2 mt-2">
        <Scissors className="w-3 h-3 text-surface-500" />
        <span className="text-[10px] text-surface-500">Scene boundaries shown as markers</span>
      </div>
    </div>
  )
}
