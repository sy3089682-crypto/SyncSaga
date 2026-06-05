"use client"

import React, { useEffect, useState } from "react"
import { useLiveKitStore, useRoomStore, useAuthStore } from "@/store"
import { LiveKitRoom, RoomAudioRenderer, VideoConference } from "@livekit/components-react"
import "@livekit/components-styles"
import { Button } from "@syncsaga/ui"
import { Mic, MicOff, Video, VideoOff } from "lucide-react"

export function VoiceVideoChat() {
  const { token, serverUrl, isMicEnabled, isCameraEnabled, toggleMic, toggleCamera, setConnectionDetails } = useLiveKitStore()
  const { roomId } = useRoomStore()
  const { user } = useAuthStore()
  const [connecting, setConnecting] = useState(false)

  // In a real app, you would fetch the token from your API: /api/livekit/token
  // Here we just mock it for UI demonstration, but it won't connect without a valid token
  const handleConnect = async () => {
    setConnecting(true)
    try {
      // Mock fetch
      // const res = await fetch(\`/api/livekit?room=\${roomId}&user=\${user?.id}\`)
      // const data = await res.json()
      // setConnectionDetails(data.serverUrl, data.token)
      
      // Since we don't have a backend running here easily returning valid tokens,
      // we just show the state change. In production, this sets real token.
      setTimeout(() => setConnecting(false), 1000)
    } catch (e) {
      console.error(e)
      setConnecting(false)
    }
  }

  return (
    <div className="flex flex-col border-b border-border-strong p-4 gap-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">Voice & Video</span>
        {!token ? (
          <Button size="sm" onClick={handleConnect} disabled={connecting}>
            {connecting ? "Connecting..." : "Join Voice/Video"}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={toggleMic}>
              {isMicEnabled ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4 text-red-500" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={toggleCamera}>
              {isCameraEnabled ? <Video className="w-4 h-4 text-white" /> : <VideoOff className="w-4 h-4 text-red-500" />}
            </Button>
          </div>
        )}
      </div>

      {token && serverUrl && (
        <div className="h-[200px] bg-black rounded-sm overflow-hidden border border-border-strong">
          <LiveKitRoom
            video={isCameraEnabled}
            audio={isMicEnabled}
            token={token}
            serverUrl={serverUrl}
            data-lk-theme="default"
            style={{ height: '100%' }}
          >
            <VideoConference />
            <RoomAudioRenderer />
          </LiveKitRoom>
        </div>
      )}
    </div>
  )
}
