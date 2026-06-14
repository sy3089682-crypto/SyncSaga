"use client"

import React, { useRef, useEffect } from "react"
import { useRoomStore, useSocketStore } from "@/store"
import { Button } from "@syncsaga/ui"
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react"

export function VideoPlayer({ url }: { url?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playbackState = useRoomStore((state) => state.playbackState)
  const playbackPosition = useRoomStore((state) => state.playbackPosition)
  const updatePlayback = useRoomStore((state) => state.updatePlayback)
  const roomId = useRoomStore((state) => state.roomId)
  const socket = useSocketStore((state) => state.socket)
  const [isMuted, setIsMuted] = React.useState(false)

  // Sync incoming state
  useEffect(() => {
    if (!videoRef.current) return
    if (playbackState === 'playing' && videoRef.current.paused) {
      videoRef.current.play().catch(console.error)
    } else if (playbackState === 'paused' && !videoRef.current.paused) {
      videoRef.current.pause()
    }
  }, [playbackState])

  // Periodic drift correction
  useEffect(() => {
    if (!videoRef.current) return
    const diff = Math.abs(videoRef.current.currentTime - playbackPosition)
    if (diff > 2.0) { // If drifted by more than 2s
      videoRef.current.currentTime = playbackPosition
    }
  }, [playbackPosition])

  const handlePlayPause = () => {
    const newState = playbackState === 'playing' ? 'paused' : 'playing'
    updatePlayback(newState, videoRef.current?.currentTime || 0)
    if (socket && roomId) {
      socket.emit("sync_playback", {
        roomId,
        state: newState,
        position: videoRef.current?.currentTime || 0
      })
    }
  }

  const handleSeek = () => {
    if (socket && roomId && videoRef.current) {
      socket.emit("sync_playback", {
        roomId,
        state: playbackState,
        position: videoRef.current.currentTime
      })
    }
  }

  return (
    <div className="relative group w-full h-full bg-black flex flex-col justify-center">
      {url ? (
        <video
          ref={videoRef}
          src={url}
          className="w-full h-full object-contain"
          onSeeked={handleSeek}
          muted={isMuted}
        />
      ) : (
        <div className="text-center text-muted-foreground w-full py-20">
          No video selected
        </div>
      )}

      {/* Custom Controls */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handlePlayPause}>
          {playbackState === 'playing' ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
        </Button>
        <div className="flex-1">
           {/* Seek Bar placeholder */}
           <div className="h-1 bg-white/30 rounded-full w-full cursor-pointer relative">
             <div className="absolute left-0 top-0 h-full bg-accent-purple rounded-full" style={{ width: '30%' }} />
           </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)}>
          {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => videoRef.current?.requestFullscreen()}>
          <Maximize className="w-5 h-5 text-white" />
        </Button>
      </div>
    </div>
  )
}
