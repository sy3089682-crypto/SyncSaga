"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useRoomStore, useAuthStore, useSocketStore } from "@/store"
import { io } from "socket.io-client"
import { VideoPlayer } from "@/components/video/VideoPlayer"
import { ChatPanel } from "@/components/chat/ChatPanel"
import { ReactionsOverlay } from "@/components/chat/ReactionsOverlay"

export default function RoomPage() {
  const { slug } = useParams()
  const { user } = useAuthStore()
  const { setRoom, clearRoom } = useRoomStore()
  const { setSocket, setConnected, disconnect } = useSocketStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug || !user) return

    // 1. Set Room State
    setRoom(slug as string, slug as string)
    
    // 2. Connect WebSocket
    // In production, this URL would come from env
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000"
    const newSocket = io(socketUrl, {
      auth: { token: 'todo-get-jwt' },
      query: { roomId: slug }
    })

    newSocket.on("connect", () => setConnected(true))
    newSocket.on("disconnect", () => setConnected(false))
    
    setSocket(newSocket)
    setLoading(false)

    return () => {
      clearRoom()
      disconnect()
    }
  }, [slug, user, setRoom, clearRoom, setSocket, setConnected, disconnect])

  if (!user) {
    return <div className="p-8 text-center">Please log in to join rooms.</div>
  }

  if (loading) {
    return <div className="p-8 text-center">Joining room...</div>
  }

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-1 lg:grid-cols-[1fr_350px] gap-4">
      {/* Video Area */}
      <Card className="flex flex-col bg-black border-border-strong overflow-hidden relative">
        <ReactionsOverlay />
        <VideoPlayer url="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" />
      </Card>

      {/* Sidebar Area (Chat / Members) */}
      <Card className="flex flex-col border-border-strong bg-surface">
        <ChatPanel />
      </Card>
    </div>
  )
}
