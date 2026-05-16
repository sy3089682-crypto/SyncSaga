'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import type { SyncState } from '@/types'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react'

interface CinemaPlayerProps {
  mediaUrl: string | null
  syncState: SyncState | null
  onPlay: () => void
  onPause: () => void
  onSeek: (time: number) => void
  isTheater: boolean
}

export function CinemaPlayer({ mediaUrl, syncState, onPlay, onPause, onSeek, isTheater }: CinemaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!syncState || !videoRef.current) return
    const video = videoRef.current
    const drift = Math.abs(video.currentTime - syncState.media_timestamp)

    if (drift > 3) {
      video.currentTime = syncState.media_timestamp
    }

    if (syncState.is_playing && video.paused) {
      video.play().catch(() => {})
    } else if (!syncState.is_playing && !video.paused) {
      video.pause()
    }

    if (syncState.playback_rate !== 1) {
      video.playbackRate = syncState.playback_rate
    }
  }, [syncState])

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => { setIsPlaying(true); onPlay() }).catch(() => {})
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
      onPause()
    }
  }, [onPlay, onPause])

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime)
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) setDuration(videoRef.current.duration)
  }, [])

  const handleSeeked = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    const time = pos * duration
    videoRef.current.currentTime = time
    setCurrentTime(time)
    onSeek(time)
  }, [duration, onSeek])

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (controlsTimer.current) clearTimeout(controlsTimer.current)
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000)
  }, [])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (!mediaUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-surface-950">
        <div className="text-center">
          <p className="text-surface-400 text-lg">No media loaded</p>
          <p className="text-surface-500 text-sm mt-1">Waiting for the host to add media...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative w-full h-full bg-black group"
      onMouseMove={showControlsTemporarily}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={mediaUrl}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
      />

      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-16 pb-4 px-4 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
        <div className="cursor-pointer mb-2" onClick={handleSeeked}>
          <div className="h-1 bg-white/20 rounded-full relative group/progress">
            <div
              className="h-full bg-brand-500 rounded-full relative"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="text-white hover:text-brand-400 transition-colors">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-1 group/vol">
              <button onClick={() => { videoRef.current!.muted = !isMuted; setIsMuted(!isMuted) }} className="text-white/80 hover:text-white transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => { const v = parseFloat(e.target.value); videoRef.current!.volume = v; setVolume(v); setIsMuted(v === 0) }}
                className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-brand-500"
              />
            </div>

            <span className="text-xs text-white/60 font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <button onClick={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen() }} className="text-white/80 hover:text-white transition-colors">
            {document.fullscreenElement ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
