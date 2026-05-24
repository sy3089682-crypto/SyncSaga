'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Users, ChevronRight, Sparkles } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api';
import { anilist } from '@/lib/anime/anilist';

export default function DiscoverPage() {
  const router = useRouter();
  const { token } = useAppStore();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'airing' | 'popular'>('all');
  const [genreFilter, setGenreFilter] = useState<string | null>(null);

  const genres = ['Action', 'Comedy', 'Romance', 'Fantasy', 'Sci-Fi', 'Slice of Life', 'Horror', 'Thriller'];

  return (
    <div className="min-h-screen bg-background text-text-primary px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Discover Rooms</h1>
          <p className="text-text-secondary">Find public watch parties or create your own.</p>
        </div>

        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'airing', 'popular'].map(f => (
            <button key={f} onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === f ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary border border-border'
              }`}>
              {f === 'all' ? 'All Rooms' : f === 'airing' ? 'Currently Airing' : 'Most Popular'}
            </button>
          ))}
          <div className="w-px h-6 bg-border mx-2" />
          {genres.map(g => (
            <button key={g} onClick={() => setGenreFilter(genreFilter === g ? null : g)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                genreFilter === g ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-surface text-text-secondary border border-border hover:border-primary/30'
              }`}>
              {g}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="p-5 rounded-2xl bg-surface border border-border hover:border-primary/30 transition-all group cursor-pointer"
              onClick={() => router.push(`/room/${i}`)}>
              <div className="flex items-start gap-4">
                <div className="w-16 h-20 rounded-lg bg-gradient-to-br from-primary/30 to-accent-cyan/30 flex items-center justify-center text-xs text-text-muted shrink-0">
                  Cover
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">Attack on Titan S4</h3>
                  <p className="text-xs text-text-muted mt-1">Episode 5 - Warhammer Titan</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 6/10</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Playing</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
