'use client'

import { useState } from 'react'
import { clips } from '@/lib/api'
import type { SyncState } from '@/types'
import { Scissors, Film } from 'lucide-react'

interface ClipCaptureProps {
  roomId: string
  syncState: SyncState | null
}

export function ClipCapture({ roomId, syncState }: ClipCaptureProps) {
  const [clipStart, setClipStart] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const startClip = () => {
    if (!syncState) return
    setClipStart(syncState.media_timestamp)
  }

  const saveClip = async () => {
    if (clipStart === null || !syncState) return
    setSaving(true)
    try {
      await clips.create(roomId, {
        start_time: clipStart,
        end_time: syncState.media_timestamp,
        title: `Clip from ${formatTime(clipStart)}`,
      })
      setClipStart(null)
    } catch {
      // error handled silently
    } finally {
      setSaving(false)
    }
  }

  const cancelClip = () => setClipStart(null)

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="card mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-surface-400" />
          <span className="text-sm font-medium text-surface-200">Clip Capture</span>
        </div>

        {clipStart === null ? (
          <button onClick={startClip} className="btn-ghost text-xs flex items-center gap-1" disabled={!syncState}>
            <Scissors className="w-3 h-3" />
            Mark Start
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-surface-400 font-mono">{formatTime(clipStart)}</span>
            <button onClick={saveClip} className="btn-primary text-xs" disabled={saving}>
              {saving ? 'Saving...' : 'Save Clip'}
            </button>
            <button onClick={cancelClip} className="btn-ghost text-xs">Cancel</button>
          </div>
        )}
      </div>
    </div>
  )
}
