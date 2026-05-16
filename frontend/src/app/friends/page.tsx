'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { feed } from '@/lib/api'
import type { ActivityEvent } from '@/types'
import { timeAgo } from '@/lib/utils'
import { Users, Smile, Video, Play } from 'lucide-react'

const eventIcons: Record<string, React.ElementType> = {
  room_created: Video,
  user_joined: Users,
  reaction: Smile,
  clip_created: Video,
  watch_started: Play,
}

const eventLabels: Record<string, string> = {
  room_created: 'created a room',
  user_joined: 'joined a room',
  reaction: 'reacted',
  clip_created: 'created a clip',
  watch_started: 'started watching',
}

export default function FriendsFeedPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    feed.list().then((res) => {
      setEvents(res.items)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen pt-14">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Activity Feed</h1>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="card h-16 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 mx-auto text-surface-600 mb-4" />
            <p className="text-surface-400">No activity yet</p>
            <p className="text-surface-500 mt-1">Join a room and start watching to see activity here!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => {
              const Icon = eventIcons[event.type] || Play
              return (
                <div key={event.id} className="card flex items-center gap-3 animate-in">
                  <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{event.user.display_name}</span>
                      {' '}{eventLabels[event.type] || event.type}
                      {event.type === 'reaction' && event.metadata?.emoji && (
                        <span className="ml-1 text-lg">{event.metadata.emoji as string}</span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-surface-500 shrink-0">{timeAgo(event.created_at)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
