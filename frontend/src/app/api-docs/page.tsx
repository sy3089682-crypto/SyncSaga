'use client'

import { BookOpen } from 'lucide-react'

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen pt-14">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="w-6 h-6 text-brand-400" />
          <h1 className="text-2xl font-bold">API Documentation</h1>
        </div>

        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-lg font-semibold mb-2">REST API</h2>
            <p className="text-sm text-surface-400 mb-4">
              The SyncSaga REST API is available at <code className="text-brand-400">/api/*</code>.
            </p>
            <div className="space-y-2 text-sm">
              <Endpoint method="POST" path="/api/auth/login" desc="Authenticate and receive JWT token" />
              <Endpoint method="POST" path="/api/auth/register" desc="Create a new account" />
              <Endpoint method="GET" path="/api/rooms" desc="List public rooms" />
              <Endpoint method="POST" path="/api/rooms" desc="Create a new room" />
              <Endpoint method="GET" path="/api/rooms/:id" desc="Get room details" />
              <Endpoint method="POST" path="/api/rooms/:id/join" desc="Join a room" />
              <Endpoint method="POST" path="/api/rooms/:id/leave" desc="Leave a room" />
              <Endpoint method="POST" path="/api/sync/:id/event" desc="Post a sync event" />
              <Endpoint method="GET" path="/api/sync/:id/state" desc="Get current sync state" />
              <Endpoint method="GET" path="/api/sync/:id/health" desc="Get sync health metrics" />
              <Endpoint method="POST" path="/api/ai/match-episode" desc="Hybrid AI episode matching" />
              <Endpoint method="GET" path="/api/ai/status" desc="AI service status" />
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-semibold mb-2">WebSocket API</h2>
            <p className="text-sm text-surface-400 mb-4">
              Connect to <code className="text-brand-400">/ws/:room_id?token=:jwt</code> for real-time sync.
            </p>
            <div className="space-y-2 text-sm">
              <Event name="sync_event" desc="Send/receive play/pause/seek events" />
              <Event name="sync_state" desc="Broadcast current sync state to all participants" />
              <Event name="reaction" desc="Send/receive emoji reactions" />
              <Event name="chat" desc="Send/receive chat messages" />
              <Event name="user_joined" desc="User joined notification" />
              <Event name="user_left" desc="User left notification" />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function Endpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  const colorMap: Record<string, string> = {
    GET: 'text-green-400',
    POST: 'text-blue-400',
    PUT: 'text-yellow-400',
    DELETE: 'text-red-400',
  }
  return (
    <div className="flex items-start gap-3 glass rounded-lg px-3 py-2">
      <span className={`font-mono text-xs font-bold shrink-0 w-14 ${colorMap[method] || 'text-surface-400'}`}>{method}</span>
      <code className="text-xs text-surface-200 font-mono shrink-0">{path}</code>
      <span className="text-xs text-surface-500">{desc}</span>
    </div>
  )
}

function Event({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 glass rounded-lg px-3 py-2">
      <code className="text-xs text-accent-400 font-mono shrink-0">{name}</code>
      <span className="text-xs text-surface-500">{desc}</span>
    </div>
  )
}
