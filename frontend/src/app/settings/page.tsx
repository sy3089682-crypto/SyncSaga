'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { Save } from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [saved, setSaved] = useState(false)

  if (!user) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen pt-14">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <form onSubmit={handleSave} className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Display Name</label>
            <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Username</label>
            <input className="input" value={user.username} disabled />
          </div>

          <button type="submit" className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  )
}
