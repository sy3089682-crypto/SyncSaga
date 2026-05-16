'use client'

import type { User } from '@/types'
import { Users } from 'lucide-react'

interface ParticipantListProps {
  participants: User[]
}

export function ParticipantList({ participants }: ParticipantListProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-surface-200">Watching</h3>
        <span className="chip">{participants.length}</span>
      </div>

      {participants.length === 0 ? (
        <div className="text-center py-6">
          <Users className="w-6 h-6 mx-auto text-surface-600 mb-2" />
          <p className="text-xs text-surface-500">No one else is here yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {participants.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand-600/20 flex items-center justify-center text-xs font-medium text-brand-400">
                {p.display_name[0].toUpperCase()}
              </div>
              <span className="text-sm text-surface-300">{p.display_name}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-auto" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
