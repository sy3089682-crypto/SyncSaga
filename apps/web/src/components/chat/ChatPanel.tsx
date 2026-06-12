"use client"

import React, { useState, useEffect, useRef } from "react"
import { useSocketStore, useAuthStore, useRoomStore } from "@/store"
import { Input, Button, Avatar, AvatarImage, AvatarFallback } from "@syncsaga/ui"
import { Send, Smile } from "lucide-react"

interface Message {
  id: string
  senderId: string
  username: string
  content: string
  timestamp: string
}

// ⚡ Bolt: Extracted ChatInput to prevent re-rendering the entire message list on every keystroke
const ChatInput = React.memo(({ onSend }: { onSend: (content: string) => boolean }) => {
  const [input, setInput] = useState("")

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    const success = onSend(input)
    if (success) {
      setInput("")
    }
  }

  return (
    <form onSubmit={handleSend} className="p-3 border-t border-border-strong flex gap-2">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a message..."
        className="flex-1"
      />
      <Button type="button" size="icon" variant="ghost">
        <Smile className="w-5 h-5 text-zinc-400" />
      </Button>
      <Button type="submit" size="icon" disabled={!input.trim()}>
        <Send className="w-5 h-5" />
      </Button>
    </form>
  )
})
ChatInput.displayName = 'ChatInput'

export function ChatPanel() {
  const { socket } = useSocketStore()
  const { user, profile } = useAuthStore()
  const { roomId } = useRoomStore()
  const [messages, setMessages] = useState<Message[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!socket) return

    socket.on("chat_message", (msg: Message) => {
      setMessages((prev) => [...prev, msg])
    })

    return () => {
      socket.off("chat_message")
    }
  }, [socket])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ⚡ Bolt: Wrapped in useCallback so ChatInput memoization works properly
  const handleSend = React.useCallback((content: string) => {
    if (!socket || !roomId || !user) return false

    const msg: Message = {
      id: Math.random().toString(),
      senderId: user.id,
      username: profile?.username || user.email || 'Anonymous',
      content,
      timestamp: new Date().toISOString()
    }

    // Optimistic update
    setMessages((prev) => [...prev, msg])
    socket.emit("send_message", { roomId, message: msg })
    return true
  }, [socket, roomId, user, profile])

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border-strong">
      <div className="p-4 border-b border-border-strong font-semibold flex items-center justify-between">
        <span>Room Chat</span>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm mt-4">
            No messages yet. Say hi!
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.username}`} />
              <AvatarFallback>{msg.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-sm">{msg.username}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-zinc-300 break-words">{msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={handleSend} />
    </div>
  )
}
