'use client'

import { useAuthStore } from '@/store/auth'
import { User, Calendar, Tv } from 'lucide-react'

export default function ProfilePage() {
  const { user } = useAuthStore()

  if (!user) return null

  return (
    <div className="min-h-screen pt-14">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="card p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-brand-600/20 flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold">{user.display_name}</h1>
          <p className="text-surface-400">@{user.username}</p>

          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-surface-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Joined {new Date(user.created_at).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1.5">
              <Tv className="w-4 h-4" />
              0 rooms hosted
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
