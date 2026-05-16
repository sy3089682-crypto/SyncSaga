'use client'

import { useState } from 'react'
import type { Reaction } from '@/types'
import { SmilePlus } from 'lucide-react'

interface ReactionBarProps {
  onReact: (emoji: string) => void
  recentReactions: Reaction[]
}

const quickEmojis = ['🔥', '💀', '😭', '😂', '😱', '🥶', '👀', '✨', '🤯', '💯', '🙏', '👏']

export function ReactionBar({ onReact, recentReactions }: ReactionBarProps) {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div className="card mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowPicker(!showPicker)} className="btn-ghost p-1.5">
            <SmilePlus className="w-4 h-4" />
          </button>
          <span className="text-xs text-surface-400">React</span>
        </div>

        {recentReactions.length > 0 && (
          <div className="flex items-center gap-1">
            {recentReactions.slice(-8).map((r, i) => (
              <div key={`${r.id}-${i}`} className="flex items-center gap-1 glass rounded-full px-2 py-0.5 animate-in">
                <span className="text-sm">{r.emoji}</span>
                <span className="text-[10px] text-surface-400">{r.user?.display_name?.[0]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPicker && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/5">
          {quickEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onReact(emoji); setShowPicker(false) }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-lg transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
