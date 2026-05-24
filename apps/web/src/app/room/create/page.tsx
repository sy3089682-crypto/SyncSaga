'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Sparkles, Globe, Lock, Users, ArrowLeft, Wand2,
  Loader2, ImageIcon,
} from 'lucide-react';
import { anilist } from '@/lib/anime/anilist';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function CreateRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAppStore();

  const animeId = searchParams.get('animeId');
  const presetTitle = searchParams.get('title');
  const presetEpisode = searchParams.get('episode');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxUsers, setMaxUsers] = useState(10);
  const [animeTitle, setAnimeTitle] = useState(presetTitle || '');
  const [animeMedia, setAnimeMedia] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (presetTitle) {
      setName(`${presetTitle} Watch Party`);
      setAnimeTitle(presetTitle);
    }
    if (animeId) {
      anilist.detail(parseInt(animeId)).then(({ Media }) => {
        setAnimeMedia(Media);
        if (!presetTitle) {
          const t = Media.title?.english || Media.title?.romaji || '';
          setAnimeTitle(t);
          if (!name) setName(`${t} Watch Party`);
        }
      }).catch(() => {});
    }
  }, [animeId, presetTitle]);

  const generateName = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await api.post<{ suggestions: string[] }>('/api/ai/generate-room-names', {
        animeTitle: animeTitle || 'Anime',
      }, token);
      setNameSuggestions(res.suggestions || []);
    } catch {
      const fallbacks = [
        `${animeTitle || 'Anime'} Night`,
        `${animeTitle || 'Anime'} Squad`,
        `Watching ${animeTitle || 'Anime'}`,
        `${animeTitle || 'Anime'} Marathon`,
        `The ${animeTitle || 'Anime'} Club`,
      ];
      setNameSuggestions(fallbacks);
    } finally {
      setGenerating(false);
    }
  }, [animeTitle, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !token) return;
    setSubmitting(true);
    try {
      const { room } = await api.post<{ room: any }>('/api/rooms', {
        name: name.trim(),
        description: description.trim() || undefined,
        isPrivate,
        maxUsers,
        animeTitle: animeTitle || undefined,
        animeMediaId: animeId ? parseInt(animeId) : undefined,
      }, token);
      router.push(`/room/${room.id}`);
    } catch (error: any) {
      console.error('Failed to create room:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Create Watch Room</h1>
          <p className="text-text-secondary mb-8">Set up a room and invite your friends to watch together.</p>

          {animeMedia && (
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface border border-border mb-8">
              <img
                src={animeMedia.coverImage?.large || animeMedia.coverImage?.medium}
                alt={animeTitle}
                className="w-16 h-20 rounded-lg object-cover shrink-0"
              />
              <div className="min-w-0">
                <p className="font-semibold truncate">{animeTitle}</p>
                <div className="flex items-center gap-2 mt-1">
                  {animeMedia.episodes && (
                    <span className="text-xs text-text-muted">{animeMedia.episodes} episodes</span>
                  )}
                  {animeMedia.averageScore && (
                    <span className="text-xs text-yellow-400">{(animeMedia.averageScore / 10).toFixed(1)} ★</span>
                  )}
                </div>
                {presetEpisode && (
                  <p className="text-xs text-primary mt-1">Starting from Episode {presetEpisode}</p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Room Name *</label>
              <div className="flex gap-2">
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Give your room a cool name..."
                  maxLength={100} required
                  className="flex-1 px-4 py-3 rounded-xl bg-surface border border-border focus:border-primary/50 text-sm outline-none transition-colors placeholder:text-text-muted" />
                <button type="button" onClick={generateName} disabled={generating}
                  className="px-4 py-3 rounded-xl bg-surface border border-border text-text-secondary hover:text-primary hover:border-primary/30 transition-colors disabled:opacity-50"
                  title="Generate creative name">
                  {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                </button>
              </div>
              {nameSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {nameSuggestions.map(s => (
                    <button key={s} type="button" onClick={() => setName(s)}
                      className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs hover:bg-primary/20 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description (optional)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="What are you watching tonight?"
                maxLength={500} rows={3}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border focus:border-primary/50 text-sm outline-none transition-colors resize-none placeholder:text-text-muted" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Visibility</label>
                <button type="button" onClick={() => setIsPrivate(!isPrivate)}
                  className={cn(
                    'w-full flex items-center gap-2 px-4 py-3 rounded-xl border text-sm transition-colors',
                    isPrivate
                      ? 'bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan'
                      : 'bg-surface border-border text-text-secondary hover:border-primary/30'
                  )}>
                  {isPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  {isPrivate ? 'Private' : 'Public'}
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max Members</label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface border border-border">
                  <Users className="w-4 h-4 text-text-muted" />
                  <input type="number" value={maxUsers} onChange={e => setMaxUsers(Math.max(2, Math.min(50, parseInt(e.target.value) || 10)))}
                    min={2} max={50}
                    className="w-full bg-transparent text-sm outline-none" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={!name.trim() || submitting || !token}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold hover:shadow-xl hover:shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {submitting ? 'Creating...' : 'Create Room'}
            </button>
          </form>

          {!token && (
            <div className="mt-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm text-center">
              Please <Link href="/auth/login" className="underline font-semibold">sign in</Link> to create a room.
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
