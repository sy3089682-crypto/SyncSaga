'use client'

import type { SyncState } from '@/types'
import { Wifi, WifiOff, Activity } from 'lucide-react'

interface SyncOverlayProps {
  syncState: SyncState | null
}

const methodLabels: Record<string, string> = {
  direct: 'Direct Sync',
  audio_fingerprint: 'Audio Fingerprint',
  visual: 'Visual Match',
  subtitle: 'Subtitle OCR',
  playback_prediction: 'Prediction',
}

export function SyncOverlay({ syncState }: SyncOverlayProps) {
  if (!syncState) {
    return (
      <div className="absolute top-3 left-3 glass rounded-lg px-3 py-1.5 flex items-center gap-2">
        <WifiOff className="w-3 h-3 text-yellow-400 animate-pulse" />
        <span className="text-xs text-yellow-400 font-medium">Connecting...</span>
      </div>
    )
  }

  const confidenceColor = syncState.confidence > 0.8 ? 'text-green-400' : syncState.confidence > 0.5 ? 'text-yellow-400' : 'text-red-400'
  const confidenceBg = syncState.confidence > 0.8 ? 'bg-green-500/10 border-green-500/20' : syncState.confidence > 0.5 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20'

  return (
    <div className="absolute top-3 left-3 glass rounded-lg px-3 py-1.5 flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Wifi className={`w-3 h-3 ${confidenceColor}`} />
        <span className={`text-xs font-medium ${confidenceColor}`}>
          {Math.round(syncState.confidence * 100)}%
        </span>
      </div>

      <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${confidenceBg} ${confidenceColor}`}>
        {methodLabels[syncState.active_method] || syncState.active_method}
      </div>
    </div>
  )
}
