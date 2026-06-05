"use client"

import React, { useEffect, useState } from "react"
import { useSocketStore } from "@/store"

interface Reaction {
  id: string
  emoji: string
  x: number
}

export function ReactionsOverlay() {
  const { socket } = useSocketStore()
  const [reactions, setReactions] = useState<Reaction[]>([])

  useEffect(() => {
    if (!socket) return

    socket.on("room_reaction", ({ emoji }: { emoji: string }) => {
      const id = Math.random().toString()
      const x = Math.random() * 80 + 10 // random x position between 10% and 90%
      setReactions((prev) => [...prev, { id, emoji, x }])

      // Remove reaction after animation completes
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== id))
      }, 2000)
    })

    return () => {
      socket.off("room_reaction")
    }
  }, [socket])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-0 text-4xl animate-float-up"
          style={{ left: `${r.x}%` }}
        >
          {r.emoji}
        </div>
      ))}
    </div>
  )
}
