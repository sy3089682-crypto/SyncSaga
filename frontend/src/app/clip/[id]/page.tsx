'use client'

import { useParams } from 'next/navigation'
import { Film } from 'lucide-react'

export default function ClipPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="min-h-screen pt-14">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Film className="w-6 h-6 text-brand-400" />
          <h1 className="text-2xl font-bold">Clip</h1>
        </div>

        <div className="card p-8 text-center">
          <p className="text-surface-400">Clip player coming soon</p>
        </div>
      </div>
    </div>
  )
}
