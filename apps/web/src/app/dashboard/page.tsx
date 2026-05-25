'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, Globe, Tv, Lock, Sparkles, Loader2, Flame, Star, Trophy, TrendingUp, Clock, Play, ChevronRight, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useRetention, useStreakDisplay } from '@/hooks/useRetention';
import { api } from '@/lib/api';
import { anilist } from '@/lib/anime/anilist';
import { Room } from '@syncsaga/shared';
import { cn } from '@/lib/utils';
import { LoadingSpinner, EmptyState, PageSkeleton, Skeleton } from '@/components/ui/Loading';

interface ContinueWatching {
  animeTitle: string;
  mediaId: number;
  episode: number;
  coverImage?: string;
  progress?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { rooms, setRooms, onlineUsers } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', description: '', isPrivate: false });
  const [creating, setCreating] = useState(false);
  const [continueWatching, setContinueWatching] = useState<ContinueWatching[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useAnalytics();
  const { stats, recordRoomJoin, xpProgress, xpToNext } = useRetention();
  const weekDays = useStreakDisplay(stats);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.get<{ rooms: Room[] }>('/api/rooms', token),
      api.get<{ recent: ContinueWatching[] }>('/api/activity/continue-watching', token).catch(() => ({ recent: [] })),
    ]).then(([roomsData, watchData]) => {
      setRooms(roomsData.rooms);
      setContinueWatching(watchData.recent || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  const createRoom = async () => {
    if (!newRoom.name.trim() || !token) return;
    setCreating(true);
    try {
      const data = await api.post<{ room: Room }>('/api/rooms', { ...newRoom, userId: user?.id }, token);
      setRooms([data.room, ...rooms]);
      recordRoomJoin();
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header + XP/Streak */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Welcome back{user?.display_name ? `, ${user.display_name}` : ''}
              </h1>
              <p className="text-text-secondary text-sm mt-1">Find a room or create your own watch party.</p>
            </div>

            {/* XP + Streak Card */}
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-surface-light border border-border flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-bold">Lv.{stats.level}</span>
                <div className="w-20 h-1.5 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full" style={{ width: `${(xpProgress / xpToNext) * 100}%` }} />
                </div>
              </div>
              <div className="px-4 py-2 rounded-xl bg-surface-light border border-border flex items-center gap-2">
                <Flame className={cn('w-4 h-4', stats.currentStreak > 0 ? 'text-orange-500' : 'text-text-muted')} />
                <span className="text-sm font-bold">{stats.currentStreak} day{stats.currentStreak !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Streak Week */}
          {stats.currentStreak > 0 && (
            <div className="flex items-center gap-1.5 mt-3">
              {weekDays.map(d => (
                <div key={d.label} className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-medium',
                  d.active ? 'bg-primary/20 text-primary' : d.isToday ? 'border border-dashed border-text-muted text-text-muted' : 'text-text-muted'
                )}>
                  {d.label[0]}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Online Friends */}
        {onlineUsers.size > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 mb-6 text-sm text-text-secondary">
            <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
            <span>{onlineUsers.size} friend{onlineUsers.size !== 1 ? 's' : ''} online</span>
          </motion.div>
        )}

        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent-cyan" />
                Continue Watching
              </h2>
              <Link href="/search" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Browse <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {continueWatching.map(item => (
                <motion.button
                  key={`${item.mediaId}-${item.episode}`}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(`/search/${item.mediaId}?episode=${item.episode}`)}
                  className="shrink-0 w-32 sm:w-36 text-left group"
                >
                  <div className="aspect-[3/4] rounded-xl overflow-hidden border border-border bg-surface-light mb-2 relative">
                    {item.coverImage ? (
                      <img src={item.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted"><Tv className="w-6 h-6" /></div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-[10px] text-white font-medium">Ep. {item.episode}</p>
                    </div>
                    {item.progress !== undefined && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-surface">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${item.progress}%` }} />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity rounded-xl">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{item.animeTitle}</p>
                </motion.button>
              ))}
            </div>
          </motion.section>
        )}

        {/* Quick Actions */}
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
          <Link href="/discover">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-light border border-border text-text-primary font-semibold hover:border-primary/50 transition-colors">
              <Globe className="w-5 h-5" />
              Discover
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
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Tv className="w-5 h-5 text-primary" />
              Your Rooms
            </h2>
          </div>

          {rooms.length === 0 ? (
            <EmptyState icon={<Tv className="w-8 h-8" />} title="No rooms yet"
              description="Create your first watch party room or join a friend's!"
              action={
                <button onClick={() => setShowCreate(true)}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors">
                  Create Room
                </button>
              }
            />
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
                        {room.playback_state === 'playing' && (
                          <span className="flex items-center gap-1 text-accent-green">
                            <Play className="w-3 h-3" /> Playing
                          </span>
                        )}
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
        </section>

        {/* Achievements Preview */}
        {stats.achievements.some(a => a.unlockedAt) && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Recent Achievements
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {stats.achievements.filter(a => a.unlockedAt).slice(-6).reverse().map(ach => (
                <div key={ach.id} className="shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-xl bg-surface-light border border-border min-w-[80px]">
                  <span className="text-2xl">{ach.icon}</span>
                  <p className="text-[10px] text-center font-medium text-text-secondary leading-tight">{ach.name}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
