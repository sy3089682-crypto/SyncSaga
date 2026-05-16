'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { rooms } from '@/lib/api'
import type { Room } from '@/types'
import { Plus, Users, Lock, Globe } from 'lucide-react'
import { formatDuration } from '@/lib/utils'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [roomList, setRoomList] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaTitle, setMediaTitle] = useState('')
  const [episode, setEpisode] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  useEffect(() => {
    rooms.list().then((res) => {
      setRoomList(res.items)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const room = await rooms.create({
      name,
      media_url: mediaUrl || undefined,
      media_title: mediaTitle || undefined,
      episode: episode ? parseInt(episode) : undefined,
      is_public: isPublic,
    })
    setRoomList((prev) => [room, ...prev])
    setShowCreate(false)
    setName('')
    setMediaUrl('')
    setMediaTitle('')
    setEpisode('')
    setIsPublic(true)
  }

  if (!user) return null

  return (
    <div className="min-h-screen pt-14">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Watch Rooms</h1>
            <p className="text-surface-400 mt-1">Join or create a room to start watching together</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Room
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="card p-6 mb-8 animate-in">
            <h2 className="text-lg font-semibold mb-4">Create Watch Room</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-surface-300 mb-1">Room Name *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Media URL</label>
                <input className="input" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Media Title</label>
                <input className="input" value={mediaTitle} onChange={(e) => setMediaTitle(e.target.value)} placeholder="Attack on Titan" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Episode</label>
                <input className="input" type="number" value={episode} onChange={(e) => setEpisode(e.target.value)} placeholder="1" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isPublic" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="rounded" />
                <label htmlFor="isPublic" className="text-sm text-surface-300">Public room</label>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit" className="btn-primary">Create Room</button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-32 animate-pulse">
                <div className="h-4 bg-surface-700 rounded w-3/4 mb-3" />
                <div className="h-3 bg-surface-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : roomList.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 mx-auto text-surface-600 mb-4" />
            <p className="text-surface-400 text-lg">No rooms yet</p>
            <p className="text-surface-500 mt-1">Create the first watch room to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roomList.map((room) => (
              <Link key={room.id} href={`/room/${room.id}`} className="card group glass-hover animate-in">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg group-hover:text-brand-400 transition-colors">{room.name}</h3>
                  {room.is_public ? (
                    <Globe className="w-4 h-4 text-surface-500" />
                  ) : (
                    <Lock className="w-4 h-4 text-surface-500" />
                  )}
                </div>
                {room.media_title && (
                  <p className="text-sm text-surface-400 mb-2">
                    {room.media_title}{room.episode ? ` - Ep. ${room.episode}` : ''}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-surface-500">
                  <Users className="w-3 h-3" />
                  <span>{room.participant_count} watching</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
