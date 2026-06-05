'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, TrendingUp, Star, Tv, Film, Clock, AlertCircle,
  Loader2, ChevronRight, Sparkles, SlidersHorizontal, X,
} from 'lucide-react';
import { anilist } from '@/lib/anime/anilist';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { debounce } from '@/lib/utils';

interface AnimeCard {
  id: number;
  title: { romaji?: string; english?: string; native?: string };
  coverImage: { large: string; medium: string; color?: string };
  episodes?: number;
  format?: string;
  genres?: string[];
  averageScore?: number;
  trending?: number;
  season?: string;
  seasonYear?: number;
  status?: string;
  nextAiringEpisode?: { episode: number };
}

const genres = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
  'Mecha', 'Music', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life',
  'Sports', 'Supernatural', 'Thriller',
];

const formats = ['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'MUSIC'];

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnimeCard[]>([]);
  const [trending, setTrending] = useState<AnimeCard[]>([]);
  const [popularSeason, setPopularSeason] = useState<AnimeCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [activeFormat, setActiveFormat] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    anilist.trending(1, 12).then(({ Page }) => setTrending(Page.media));
    anilist.popularThisSeason(1, 12).then(({ Page }) => setPopularSeason(Page.media));
  }, []);

  const doSearch = useCallback(async (q: string, genre?: string | null, format?: string | null, p = 1) => {
    setLoading(true);
    try {
      const params: any = { page: p, perPage: 20 };
      if (q) params.search = q;
      if (genre) params.genre = genre;
      if (format) params.format = format;

      const { Page } = await anilist.searchAdvanced(params);
      if (p === 1) setResults(Page.media);
      else setResults(prev => [...prev, ...Page.media]);
      setHasMore(Page.pageInfo?.hasNextPage || false);
      setPage(p);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearchRef = useRef(debounce((value: string) => {
    if (value.trim()) doSearch(value.trim(), activeGenre, activeFormat, 1);
    else setResults([]);
  }, 400));

  useEffect(() => {
    debouncedSearchRef.current(query);
  }, [query, activeGenre, activeFormat]);

  const handleGenreClick = (genre: string) => {
    const next = activeGenre === genre ? null : genre;
    setActiveGenre(next);
    if (query.trim() || next) doSearch(query.trim(), next, activeFormat, 1);
  };

  const handleFormatClick = (format: string) => {
    const next = activeFormat === format ? null : format;
    setActiveFormat(next);
    if (query.trim() || next) doSearch(query.trim(), activeGenre, next, 1);
  };

  const clearFilters = () => {
    setActiveGenre(null);
    setActiveFormat(null);
    setQuery('');
    setResults([]);
  };

  const hasActiveFilters = activeGenre || activeFormat;

  const AnimeCardComponent = ({ anime, index = 0 }: { anime: AnimeCard; index?: number }) => {
    const title = anime.title?.english || anime.title?.romaji || 'Unknown';
    const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
    const coverColor = anime.coverImage?.color || '#8b5cf6';

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className="group relative rounded-2xl overflow-hidden bg-surface border border-border hover:border-primary/40 transition-all hover:-translate-y-1 duration-300"
      >
        <div className="aspect-[3/4] relative overflow-hidden">
          <img
            src={anime.coverImage?.large || anime.coverImage?.medium}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {score && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-white font-semibold">{score}</span>
            </div>
          )}

          {anime.format && (
            <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[10px] text-white uppercase">
              {anime.format}
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="text-sm font-semibold text-white truncate drop-shadow-lg">{title}</h3>
            <div className="flex items-center gap-2 mt-1">
              {anime.episodes && (
                <span className="text-[10px] text-text-secondary">{anime.episodes} eps</span>
              )}
              {anime.season && anime.seasonYear && (
                <span className="text-[10px] text-text-secondary">
                  {anime.season.charAt(0) + anime.season.slice(1).toLowerCase()} {anime.seasonYear}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-3 space-y-2">
          {anime.genres && anime.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {anime.genres.slice(0, 3).map((g: string) => (
                <span key={g} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px]">{g}</span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Link href={`/room/create?animeId=${anime.id}&title=${encodeURIComponent(title)}`}
              className="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors text-center">
              Create Room
            </Link>
            <button onClick={() => router.push(`/search/${anime.id}`)}
              className="px-3 py-2 rounded-lg bg-surface-light text-text-secondary hover:text-text-primary text-xs transition-colors">
              Info
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-text-primary pb-20 lg:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Discover Anime</h1>
          <p className="text-text-secondary">Search, explore, and create watch parties for your favorite anime.</p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search anime by title..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-surface border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 text-sm outline-none transition-all placeholder:text-text-muted"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <button onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
              showFilters || hasActiveFilters
                ? 'bg-primary/20 border-primary/30 text-primary'
                : 'bg-surface border-border text-text-secondary hover:border-primary/30'
            )}>
            <SlidersHorizontal className="w-3 h-3" />
            Filters
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
          </button>

          {activeGenre && (
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs">
              {activeGenre}
              <button onClick={() => handleGenreClick(activeGenre)}><X className="w-3 h-3" /></button>
            </span>
          )}
          {activeFormat && (
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent-cyan/20 border border-accent-cyan/30 text-accent-cyan text-xs">
              {activeFormat}
              <button onClick={() => handleFormatClick(activeFormat)}><X className="w-3 h-3" /></button>
            </span>
          )}

          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-text-muted hover:text-text-secondary ml-1">
              Clear all
            </button>
          )}
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="p-4 rounded-2xl bg-surface border border-border space-y-4">
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Genre</p>
                  <div className="flex flex-wrap gap-2">
                    {genres.map((g: string) => (
                      <button key={g} onClick={() => handleGenreClick(g)}
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                          activeGenre === g
                            ? 'bg-primary/20 border-primary/30 text-primary'
                            : 'bg-surface-light border-border text-text-secondary hover:border-primary/30'
                        )}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Format</p>
                  <div className="flex flex-wrap gap-2">
                    {formats.map(f => (
                      <button key={f} onClick={() => handleFormatClick(f)}
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                          activeFormat === f
                            ? 'bg-accent-cyan/20 border-accent-cyan/30 text-accent-cyan'
                            : 'bg-surface-light border-border text-text-secondary hover:border-accent-cyan/30'
                        )}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Results */}
        {query && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Search className="w-4 h-4" />
                Results for &ldquo;{query}&rdquo;
              </h2>
              {loading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {results.map((anime, i) => (
                <AnimeCardComponent key={anime.id} anime={anime} index={i} />
              ))}
            </div>
            {results.length === 0 && !loading && (
              <div className="text-center py-12">
                <AlertCircle className="w-8 h-8 text-text-muted mx-auto mb-3" />
                <p className="text-text-muted">No results found. Try different keywords or filters.</p>
              </div>
            )}
            {hasMore && (
              <div className="text-center mt-6">
                <button onClick={() => doSearch(query, activeGenre, activeFormat, page + 1)}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-surface border border-border text-sm font-medium hover:border-primary/30 transition-colors disabled:opacity-50">
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Trending Section */}
        {!query && (
          <>
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent-pink" />
                  Trending Now
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {trending.map((anime, i) => (
                  <AnimeCardComponent key={anime.id} anime={anime} index={i} />
                ))}
              </div>
            </section>

            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent-cyan" />
                  Popular This Season
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {popularSeason.map((anime, i) => (
                  <AnimeCardComponent key={anime.id} anime={anime} index={i} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
