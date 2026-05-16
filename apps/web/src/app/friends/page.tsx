'use client';

import { motion } from 'framer-motion';
import { Users, UserPlus, MessageCircle, MoreVertical, Circle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const mockFriends = [
  { id: '1', name: 'Alex', username: 'alex_watcher', status: 'watching', activity: 'Watching AoT', avatar: 'A' },
  { id: '2', name: 'Sam', username: 'sam_anime', status: 'online', activity: null, avatar: 'S' },
  { id: '3', name: 'Jordan', username: 'jordan_jk', status: 'away', activity: 'AFK', avatar: 'J' },
  { id: '4', name: 'Casey', username: 'casey_op', status: 'offline', activity: null, avatar: 'C' },
  { id: '5', name: 'Riley', username: 'riley_ds', status: 'watching', activity: 'Demon Slayer', avatar: 'R' },
];

function getStatusColor(status: string) {
  switch (status) {
    case 'online': return 'bg-accent-green';
    case 'watching': return 'bg-primary';
    case 'away': return 'bg-yellow-500';
    default: return 'bg-text-muted';
  }
}

export default function FriendsPage() {
  const [filter, setFilter] = useState<'all' | 'online' | 'pending'>('all');

  const filtered = mockFriends.filter(f => {
    if (filter === 'online') return f.status !== 'offline';
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Friends</h1>
            <p className="text-text-secondary">Connect with fellow anime fans</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors">
            <UserPlus className="w-4 h-4" />
            Add Friend
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {(['all', 'online', 'pending'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                filter === tab
                  ? "bg-surface-light text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'online' && (
                <span className="ml-1.5 text-xs text-accent-green">
                  {mockFriends.filter(f => f.status !== 'offline').length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map((friend, i) => (
            <motion.div
              key={friend.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 p-4 rounded-2xl bg-card-gradient border border-border hover:border-primary/20 transition-all group"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-accent-cyan/30 flex items-center justify-center font-semibold">
                  {friend.avatar}
                </div>
                <div className={cn("absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background", getStatusColor(friend.status))} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{friend.name}</h3>
                  <span className="text-xs text-text-muted">@{friend.username}</span>
                </div>
                {friend.activity && (
                  <p className="text-sm text-primary truncate">{friend.activity}</p>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 rounded-lg hover:bg-surface-light text-text-secondary transition-colors">
                  <MessageCircle className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-lg hover:bg-surface-light text-text-secondary transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
