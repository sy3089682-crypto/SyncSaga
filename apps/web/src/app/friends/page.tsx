'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Users, Search, MessageCircle, Check, X, Loader2, UserMinus, Clock } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

export default function FriendsPage() {
  const { token, onlineUsers } = useAppStore();
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.get('/api/friends', token),
      api.get('/api/friends/requests', token),
    ]).then(([friendsData, requestsData]: any[]) => {
      setFriends(friendsData.friends || []);
      setRequests(requestsData.requests || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await api.get<any>(`/api/users/search?q=${encodeURIComponent(query)}`, token);
      setSearchResults(data.users || []);
    } catch {} finally {
      setSearching(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      await api.post('/api/friends/request', { friendId: userId }, token);
      setSearchResults(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error('Failed to send request:', err);
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      await api.post('/api/friends/accept', { requestId }, token);
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error('Failed to accept request:', err);
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      await api.post('/api/friends/reject', { requestId }, token);
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error('Failed to reject request:', err);
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      await api.delete(`/api/friends/${friendId}`, token);
      setFriends(prev => prev.filter(f => f.id !== friendId));
    } catch (err) {
      console.error('Failed to remove friend:', err);
    }
  };

  const tabs = [
    { id: 'friends' as const, label: 'Friends', count: friends.length, icon: Users },
    { id: 'requests' as const, label: 'Requests', count: requests.length, icon: UserPlus },
    { id: 'search' as const, label: 'Find People', icon: Search },
  ];

  return (
    <div className="min-h-screen bg-background text-text-primary pb-20 lg:pb-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold mb-6">
          Friends
        </motion.h1>

        <div className="flex gap-2 mb-6">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                activeTab === tab.id ? 'bg-primary text-white' : 'bg-surface-light text-text-secondary hover:text-text-primary'
              )}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'friends' && (
            <motion.div key="friends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No friends yet</h3>
                  <p className="text-text-secondary mb-4">Search for people to watch anime with!</p>
                  <button onClick={() => setActiveTab('search')}
                    className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors">
                    Find Friends
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {friends.map((friend, i) => (
                    <motion.div key={friend.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-surface-light border border-border hover:border-primary/30 transition-all">
                      <Avatar name={friend.username} src={friend.avatar_url}
                        status={onlineUsers.has(friend.id) ? 'online' : 'offline'} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{friend.display_name || friend.username}</p>
                        <p className="text-xs text-text-muted">@{friend.username}</p>
                      </div>
                      <div className="flex gap-1">
                        <button className="p-2 rounded-lg hover:bg-surface text-text-secondary transition-colors" title="Message">
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => removeFriend(friend.id)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-500 transition-colors" title="Remove">
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'requests' && (
            <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {requests.length === 0 ? (
                <div className="text-center py-16">
                  <Clock className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                  <p className="text-text-secondary">Friend requests will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req, i) => (
                    <motion.div key={req.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-surface-light border border-border">
                      <Avatar name={req.sender?.username || '?'} src={req.sender?.avatar_url} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{req.sender?.display_name || req.sender?.username || 'Unknown'}</p>
                        <p className="text-xs text-text-muted">Wants to be friends</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => acceptRequest(req.id)}
                          className="p-2 rounded-lg bg-accent-green/10 text-accent-green hover:bg-accent-green/20 transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => rejectRequest(req.id)}
                          className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'search' && (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)}
                  placeholder="Search by username..."
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-surface-light border border-border text-text-primary placeholder:text-text-muted focus:border-primary outline-none transition-colors" />
              </div>

              {searching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((user, i) => (
                    <motion.div key={user.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-surface-light border border-border">
                      <Avatar name={user.username} src={user.avatar_url} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{user.display_name || user.username}</p>
                        <p className="text-xs text-text-muted">@{user.username}</p>
                      </div>
                      <button onClick={() => sendFriendRequest(user.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors">
                        <UserPlus className="w-4 h-4" />
                        Add
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : searchQuery.length >= 2 ? (
                <div className="text-center py-8 text-text-muted">
                  <p>No users found matching &quot;{searchQuery}&quot;</p>
                </div>
              ) : (
                <div className="text-center py-8 text-text-muted">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>Type at least 2 characters to search</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
