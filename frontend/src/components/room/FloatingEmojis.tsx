'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface FloatingEmoji {
  id: string
  emoji: string
  x: number
  y: number
  rotation: number
  scale: number
}

interface FloatingEmojisProps {
  containerId?: string
}

const EMOJI_LIST = ['🔥', '💀', '😭', '😂', '😱', '🥶', '👀', '✨', '🤯', '💯', '🙏', '👏', '🎉', '💥', '⚡', '❤️']

export function useFloatingEmojis() {
  const [emojis, setEmojis] = useState<FloatingEmoji[]>([])
  const counterRef = useRef(0)

  const addEmoji = useCallback((emoji?: string, sourceX?: number, sourceY?: number) => {
    const id = `emoji-${counterRef.current++}`
    const e = emoji || EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)]
    const burst = 1 + Math.floor(Math.random() * 3)

    const newEmojis: FloatingEmoji[] = []
    for (let i = 0; i < burst; i++) {
      newEmojis.push({
        id: `${id}-${i}`,
        emoji: e,
        x: sourceX ?? (40 + Math.random() * 20),
        y: sourceY ?? (60 + Math.random() * 30),
        rotation: (Math.random() - 0.5) * 60,
        scale: 0.5 + Math.random() * 1.0,
      })
    }

    setEmojis((prev) => [...prev.slice(-30), ...newEmojis])

    setTimeout(() => {
      setEmojis((prev) => prev.filter((f) => !newEmojis.some((n) => n.id === f.id)))
    }, 2000)
  }, [])

  return { emojis, addEmoji }
}

export function FloatingEmojisRenderer({ emojis }: { emojis: FloatingEmoji[] }) {
  return (
    <AnimatePresence>
      {emojis.map((e) => (
        <motion.div
          key={e.id}
          initial={{
            opacity: 1,
            x: `${e.x}%`,
            y: `${e.y}%`,
            scale: 0,
            rotate: 0,
          }}
          animate={{
            opacity: [1, 1, 0],
            y: [`${e.y}%`, `${e.y - 30}%`, `${e.y - 60}%`],
            x: [`${e.x}%`, `${e.x + (Math.random() - 0.5) * 10}%`],
            scale: [e.scale * 0.5, e.scale, e.scale * 0.3],
            rotate: [0, e.rotation, e.rotation * 2],
          }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: 2, ease: 'easeOut' }}
          className="absolute pointer-events-none text-2xl z-50"
          style={{ willChange: 'transform' }}
        >
          {e.emoji}
        </motion.div>
      ))}
    </AnimatePresence>
  )
}

export function EmojiBurstButton({ onBurst }: { onBurst: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onBurst}
      className="w-10 h-10 rounded-full bg-brand-600/20 flex items-center justify-center text-lg hover:bg-brand-600/30 transition-colors"
      title="Send hype burst!"
    >
      🎉
    </motion.button>
  )
}
