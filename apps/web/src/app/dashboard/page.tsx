'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, Globe, Tv, Lock, Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Room } from '@syncsaga/shared';
import { cn } from '@/lib/utils';
import { LoadingSpinner, EmptyState, PageSkeleton } from '@/components/ui/Loading';

export default function DashboardPage() {
  const { user, token } = useAuth();
  const { rooms, setRooms, onlineUsers } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', description: '', isPrivate: false });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get<{ rooms: Room[] }>('/api/rooms', token)
      .then(data => setRooms(data.rooms))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const createRoom = async () => {
    if (!newRoom.name.trim() || !token) return;
    setCreating(true);
    try {
      const data = await api.post<{ room: Room }>('/api/rooms', { ...newRoom, userId: user?.id }, token);
      setRooms([data.room, ...rooms]);
      setShowCreate(false);
      setNewRoom({ name: '', description: '', isPrivate: false });
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="min-h-screen bg-background text-text-primary pb-20 lg:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold mb-1">
            Welcome back{user?.display_name ? `, ${user.display_name}` : ''}
          </h1>
          <p className="text-text-secondary">Find a room or create your own watch party.</p>
        </motion.div>

        {onlineUsers.size > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 mb-6 text-sm text-text-secondary">
            <div className="w-2 h-2 rounded-full bg-accent-green" />
            <span>{onlineUsers.size} friend{onlineUsers.size !== 1 ? 's' : ''} online</span>
          </motion.div>
        )}

        <div className="flex flex-wrap gap-3 mb-8">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25">
            <Plus className="w-5 h-5" />
            Create Room
          </motion.button>
          <Link href="/friends">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-light border border-border text-text-primary font-semibold hover:border-primary/50 transition-colors">
              <Users className="w-5 h-5" />
              Find Friends
            </motion.button>
          </Link>
        </div>

        {/* Create Room Form */}
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 rounded-2xl bg-card-gradient border border-border">
            <h3 className="font-semibold text-lg mb-4">Create a Room</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Room name" value={newRoom.name} onChange={e => setNewRoom({ ...newRoom, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-surface-light border border-border text-text-primary placeholder:text-text-muted focus:border-primary outline-none transition-colors" />
              <input type="text" placeholder="Description (optional)" value={newRoom.description} onChange={e => setNewRoom({ ...newRoom, description: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-surface-light border border-border text-text-primary placeholder:text-text-muted focus:border-primary outline-none transition-colors" />
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setNewRoom({ ...newRoom, isPrivate: !newRoom.isPrivate })}
                  className={cn('w-5 h-5 rounded border-2 flex items-center justify-center transition-colors', newRoom.isPrivate ? 'bg-primary border-primary' : 'border-border')}>
                  {newRoom.isPrivate && <Lock className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm text-text-secondary">Private room</span>
              </label>
              <button onClick={createRoom} disabled={creating || !newRoom.name.trim()}
                className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark disabled:opacity-50 transition-colors">
                {creating ? 'Creating...' : 'Create Room'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Rooms Grid */}
        {rooms.length === 0 ? (
          <EmptyState icon={<Tv className="w-8 h-8" />} title="No rooms yet" description="Be the first to create a watch party room!" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room, i) => (
              <motion.div key={room.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link href={`/room/${room.id}`}>
                  <div className="group p-5 rounded-2xl bg-card-gradient border border-border hover:border-primary/30 transition-all hover:-translate-y-1 cursor-pointer h-full flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1">{room.name}</h3>
                      {room.is_private && <Lock className="w-4 h-4 text-text-muted shrink-0" />}
                    </div>
                    {room.description && <p className="text-sm text-text-secondary mb-3 line-clamp-2">{room.description}</p>}
                    <div className="mt-auto flex items-center gap-4 text-sm text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {room.members?.length || 0}/{room.max_users}
                      </span>
                    </div>
                    <div className="mt-3 w-full bg-surface rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-accent-cyan rounded-full transition-all"
                        style={{ width: `${Math.min((room.members?.length || 0) / room.max_users * 100, 100)}%` }} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
