'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Users, ChevronRight, Sparkles, Globe, Lock, Loader2, Tv, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { anilist } from '@/lib/anime/anilist';
import { cn } from '@/lib/utils';
import { LoadingSpinner, EmptyState, Skeleton } from '@/components/ui/Loading';

interface DiscoverRoom {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  max_users: number;
  member_count: number;
  anime_title: string | null;
  anime_cover_url: string | null;
  current_episode_number: number | null;
  playback_state: string;
  host_name?: string;
}

interface TrendingAnime {
  id: number;
  title: string;
  coverImage: string;
  episodes: number;
  averageScore: number;
  genres: string[];
  trending: number;
  nextAiring?: { episode: number; airingAt: number };
}

export default function DiscoverPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [rooms, setRooms] = useState<DiscoverRoom[]>([]);
  const [trending, setTrending] = useState<TrendingAnime[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'airing' | 'popular'>('all');
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const genres = ['Action', 'Comedy', 'Romance', 'Fantasy', 'Sci-Fi', 'Slice of Life', 'Horror', 'Thriller'];

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    api.get<{ rooms: DiscoverRoom[] }>('/api/rooms/discover')
      .then(data => setRooms(data.rooms || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));

  }, [token]);

  useEffect(() => {
    setTrendingLoading(true);
    anilist.trending(1, 12)
      .then(({ data }: any) => {
        const media = data?.Page?.media || [];
        setTrending(media.map((m: any) => ({
          id: m.id,
          title: m.title?.english || m.title?.romaji || 'Unknown',
          coverImage: m.coverImage?.large || m.coverImage?.medium || '',
          episodes: m.episodes || 0,
          averageScore: m.averageScore || 0,
          genres: m.genres || [],
          trending: m.trending || 0,
          nextAiring: m.nextAiringEpisode ? {
            episode: m.nextAiringEpisode.episode,
            airingAt: m.nextAiringEpisode.airingAt,
          } : undefined,
        })));
      })
      .catch(() => {})
      .finally(() => setTrendingLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink pb-20 lg:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Discover</h1>
          <p className="text-ink-soft">Find public watch parties and trending anime.</p>
        </motion.div>

        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Trending Anime
            </h2>
            <button onClick={() => router.push('/search')} className="text-sm text-amber hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {trendingLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="shrink-0 w-36 sm:w-40">
                  <Skeleton className="aspect-[3/4] rounded-xl mb-2" />
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {trending.map(anime => (
                <motion.button
                  key={anime.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(`/search/${anime.id}`)}
                  className="shrink-0 w-36 sm:w-40 text-left group"
                >
                  <div className="aspect-[3/4] rounded-xl overflow-hidden border border-border bg-elevated mb-2 relative">
                    {anime.coverImage ? (
                      <img src={anime.coverImage} alt={anime.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ink-mute"><Tv className="w-8 h-8" /></div>
                    )}
                    {anime.averageScore > 0 && (
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-yellow-400 text-[10px] font-bold">
                        {(anime.averageScore / 10).toFixed(1)}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate group-hover:text-amber transition-colors">{anime.title}</p>
                  <p className="text-xs text-ink-mute">{anime.episodes} eps</p>
                </motion.button>
              ))}
            </div>
          )}
        </section>

        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin">
          {['all', 'airing', 'popular'].map(f => (
            <button key={f} onClick={() => setFilter(f as any)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                filter === f ? 'bg-amber text-canvas' : 'bg-surface text-ink-soft hover:text-ink border border-border'
              )}>
              {f === 'all' ? 'All Rooms' : f === 'airing' ? 'Currently Airing' : 'Most Popular'}
            </button>
          ))}
          <div className="w-px h-6 bg-border mx-2 shrink-0" />
          {genres.map(g => (
            <button key={g} onClick={() => setGenreFilter(genreFilter === g ? null : g)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
                genreFilter === g ? 'bg-amber-strong text-amber border border-amber/30' : 'bg-surface text-ink-soft border border-border hover:border-amber/30'
              )}>
              {g}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-ink-mute mb-2">Failed to load rooms</p>
            <button onClick={() => window.location.reload()} className="text-amber text-sm hover:underline">Try again</button>
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState
            icon={<Globe className="w-8 h-8" />}
            title="No public rooms available"
            description="Create your own watch party and it will appear here!"
            action={
              <button onClick={() => router.push('/room/create')}
                className="px-6 py-2.5 rounded-xl bg-amber text-canvas font-medium hover:bg-amber-hover transition-colors">
                Create Room
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.filter(r => !r.is_private).map((room, i) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div
                  onClick={() => router.push(`/room/${room.id}`)}
                  className="p-4 sm:p-5 rounded-2xl bg-surface border border-border hover:border-amber/30 transition-all hover:-translate-y-0.5 cursor-pointer group h-full flex flex-col"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {room.anime_cover_url ? (
                      <img src={room.anime_cover_url} alt="" className="w-14 h-20 sm:w-16 sm:h-20 rounded-lg object-cover shrink-0" loading="lazy" />
                    ) : (
                      <div className="w-14 h-20 sm:w-16 sm:h-20 rounded-lg bg-gradient-to-br from-amber/30 to-amber/30 flex items-center justify-center text-xs text-ink-mute shrink-0">
                        No Cover
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate group-hover:text-amber transition-colors text-sm sm:text-base">{room.name}</h3>
                      {room.anime_title && (
                        <p className="text-xs text-ink-mute mt-0.5 truncate">{room.anime_title}{room.current_episode_number ? ` Ep.${room.current_episode_number}` : ''}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-ink-soft">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {room.member_count}/{room.max_users}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {room.playback_state === 'playing' ? 'Playing' : room.playback_state === 'paused' ? 'Paused' : 'Waiting'}
                        </span>
                      </div>
                      {room.host_name && (
                        <p className="text-[10px] text-ink-mute mt-1">Hosted by {room.host_name}</p>
                      )}
                    </div>
                    {room.is_private ? <Lock className="w-3.5 h-3.5 text-ink-mute shrink-0" /> : <Globe className="w-3.5 h-3.5 text-success shrink-0" />}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
