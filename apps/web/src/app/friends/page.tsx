'use client';

import { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Users, UserPlus, MessageCircle, MoreVertical, Circle, Search, X, Check, X as XIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';
import { EmptyState } from '@/components/ui/Loading';

const mockFriends = [
  { id: '1', name: 'Alex', username: 'alex_watcher', status: 'watching', activity: 'Watching AoT', avatar: 'A' },
  { id: '2', name: 'Sam', username: 'sam_anime', status: 'online', activity: null, avatar: 'S' },
  { id: '3', name: 'Jordan', username: 'jordan_jk', status: 'away', activity: 'AFK', avatar: 'J' },
  { id: '4', name: 'Casey', username: 'casey_op', status: 'offline', activity: null, avatar: 'C' },
  { id: '5', name: 'Riley', username: 'riley_ds', status: 'watching', activity: 'Demon Slayer', avatar: 'R' },
];

const mockRequests = [
  { id: '6', name: 'Morgan', username: 'morgan_anime', avatar: 'M' },
  { id: '7', name: 'Taylor', username: 'taylor_watch', avatar: 'T' },
];

type Tab = 'all' | 'online' | 'pending' | 'blocked';

function getStatusColor(status: string) {
  switch (status) {
    case 'online': return 'bg-accent-green';
    case 'watching': return 'bg-primary';
    case 'away': return 'bg-yellow-500';
    default: return 'bg-text-muted';
  }
}

export default function FriendsPage() {
  const [tab, setTab] = useState<Tab>('online');
  const [search, setSearch] = useState('');

  const filtered = mockFriends.filter(f => {
    if (tab === 'online') return f.status !== 'offline';
    if (tab === 'pending') return false;
    if (search) return f.name.toLowerCase().includes(search.toLowerCase()) || f.username.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const tabs: Tab[] = ['online', 'all', 'pending'];

  return (
    <div className="min-h-screen bg-background text-text-primary pb-20 lg:pb-0">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">Friends</h1>
            <p className="text-text-secondary">{mockFriends.filter(f => f.status !== 'offline').length} online</p>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25">
            <UserPlus className="w-4 h-4" />
            Add Friend
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input type="text" placeholder="Search friends..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-light border border-border text-text-primary placeholder:text-text-muted focus:border-primary outline-none transition-colors" />
        </div>

        {/* Tabs */}
        <LayoutGroup>
          <div className="flex gap-2 mb-6">
            {tabs.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("relative px-5 py-2 rounded-lg text-sm font-medium transition-colors", tab === t ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary')}>
                {t === 'online' && <span className="mr-1.5 text-xs text-accent-green">{mockFriends.filter(f => f.status !== 'offline').length}</span>}
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {tab === t && <motion.div layoutId="friend-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
              </button>
            ))}
          </div>
        </LayoutGroup>

        {/* Friend Requests */}
        {tab === 'pending' && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Requests
            </h3>
            {mockRequests.map((req, i) => (
              <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-card-gradient border border-border hover:border-primary/20 transition-all mb-2 group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-accent-cyan/30 flex items-center justify-center font-semibold">{req.avatar}</div>
                <div className="flex-1">
                  <p className="font-medium">{req.name}</p>
                  <p className="text-xs text-text-muted">@{req.username}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-lg bg-accent-green/10 text-accent-green hover:bg-accent-green/20 transition-colors"><Check className="w-4 h-4" /></button>
                  <button className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"><XIcon className="w-4 h-4" /></button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Friends List */}
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <EmptyState icon={<Users className="w-8 h-8" />} title="No friends here" description="Add some friends to get started!" />
          ) : (
            <div className="space-y-2">
              {filtered.map((friend, i) => (
                <motion.div key={friend.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-card-gradient border border-border hover:border-primary/20 transition-all group">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/30 to-accent-cyan/30 flex items-center justify-center font-semibold">
                      {friend.avatar}
                    </div>
                    <div className={cn("absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background", getStatusColor(friend.status))} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{friend.name}</h3>
                      <span className="text-xs text-text-muted">@{friend.username}</span>
                    </div>
                    {friend.activity ? (
                      <p className="text-sm text-primary truncate">{friend.activity}</p>
                    ) : (
                      <p className="text-xs text-text-muted capitalize">{friend.status}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 rounded-lg hover:bg-surface-light text-text-secondary transition-colors"><MessageCircle className="w-4 h-4" /></button>
                    <button className="p-2 rounded-lg hover:bg-surface-light text-text-secondary transition-colors"><MoreVertical className="w-4 h-4" /></button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
