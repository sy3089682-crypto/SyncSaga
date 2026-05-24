'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Star, Play, Calendar, Clock, BookOpen, Tv, Users,
  ExternalLink, Loader2, ArrowLeft, Heart, Share2,
} from 'lucide-react';
import { anilist } from '@/lib/anime/anilist';
import { jikan } from '@/lib/anime/jikan';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AnimeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);
  const [media, setMedia] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [episodePage, setEpisodePage] = useState(1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { Media } = await anilist.detail(id);
        setMedia(Media);

        if (Media.idMal) {
          try {
            const [eps, chars] = await Promise.all([
              jikan.episodes(Media.idMal).catch(() => []),
              jikan.characters(Media.idMal).catch(() => []),
            ]);
            setEpisodes(Array.isArray(eps) ? eps : []);
            setCharacters(Array.isArray(chars) ? chars.slice(0, 20) : []);
          } catch {}
        }
      } catch (error) {
        console.error('Failed to load anime:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!media) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text-muted">Anime not found</p>
      </div>
    );
  }

  const title = media.title?.english || media.title?.romaji || 'Unknown';
  const score = media.averageScore ? (media.averageScore / 10).toFixed(1) : null;

  return (
    <div className="min-h-screen bg-background text-text-primary pb-20">
      {/* Hero Section */}
      <div className="relative h-[40vh] sm:h-[50vh] overflow-hidden">
        {media.bannerImage ? (
          <img src={media.bannerImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/40 via-accent-pink/20 to-accent-cyan/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        <button onClick={() => router.back()}
          className="absolute top-4 left-4 p-2 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors z-10">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="max-w-7xl mx-auto flex items-end gap-6">
            <div className="w-28 sm:w-36 rounded-xl overflow-hidden shadow-2xl border border-white/10 shrink-0 hidden sm:block">
              <img src={media.coverImage?.large || media.coverImage?.medium} alt={title} className="w-full aspect-[3/4] object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-4xl font-bold mb-2 drop-shadow-lg">{title}</h1>
              {media.title?.native && (
                <p className="text-sm text-text-secondary mb-3">{media.title.native}</p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                {score && (
                  <span className="flex items-center gap-1 text-sm text-yellow-400">
                    <Star className="w-4 h-4 fill-yellow-400" />{score}
                  </span>
                )}
                {media.format && (
                  <span className="px-2 py-0.5 rounded bg-white/10 text-xs uppercase">{media.format}</span>
                )}
                {media.episodes && (
                  <span className="flex items-center gap-1 text-xs text-text-secondary">
                    <BookOpen className="w-3 h-3" />{media.episodes} eps
                  </span>
                )}
                {media.duration && (
                  <span className="flex items-center gap-1 text-xs text-text-secondary">
                    <Clock className="w-3 h-3" />{media.duration} min
                  </span>
                )}
                {media.status && (
                  <span className="flex items-center gap-1 text-xs text-text-secondary capitalize">
                    <Tv className="w-3 h-3" />{media.status.toLowerCase().replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <Link href={`/room/create?animeId=${media.id}&title=${encodeURIComponent(title)}`}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25">
                <Play className="w-4 h-4" />
                Create Watch Room
              </Link>
              <button className="p-3 rounded-xl bg-surface border border-border text-text-secondary hover:text-text-primary transition-colors">
                <Heart className="w-4 h-4" />
              </button>
              <button className="p-3 rounded-xl bg-surface border border-border text-text-secondary hover:text-text-primary transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            {/* Synopsis */}
            {media.description && (
              <section>
                <h2 className="text-lg font-semibold mb-3">Synopsis</h2>
                <p className="text-sm text-text-secondary leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: media.description.replace(/<br\s*\/?>/gi, '\n') }} />
              </section>
            )}

            {/* Genres */}
            {media.genres && media.genres.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3">Genres</h2>
                <div className="flex flex-wrap gap-2">
                  {media.genres.map(g => (
                    <Link key={g} href={`/search?genre=${g}`}
                      className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm hover:bg-primary/20 transition-colors">
                      {g}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Episodes */}
            {episodes.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3">Episodes</h2>
                <div className="space-y-1">
                  {episodes.slice(0, episodePage * 25).map((ep: any) => (
                    <Link key={ep.mal_id} href={`/room/create?animeId=${media.id}&episode=${ep.mal_id}&title=${encodeURIComponent(title)}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-light transition-colors group">
                      {ep.thumbnail && (
                        <img src={ep.thumbnail} alt="" className="w-20 h-12 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          #{ep.mal_id} {ep.title}
                        </p>
                        {ep.air_date && (
                          <p className="text-xs text-text-muted">{new Date(ep.air_date).toLocaleDateString()}</p>
                        )}
                      </div>
                      <Play className="w-4 h-4 text-text-muted group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                    </Link>
                  ))}
                </div>
                {episodes.length > episodePage * 25 && (
                  <button onClick={() => setEpisodePage(p => p + 1)}
                    className="w-full py-3 text-sm text-primary hover:underline mt-2">
                    Show more episodes
                  </button>
                )}
              </section>
            )}

            {/* Characters */}
            {characters.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3">Characters</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {characters.map((char: any, i: number) => {
                    const va = char.voice_actors?.[0];
                    return (
                      <div key={char.character?.mal_id || i} className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border">
                        <img src={char.character?.images?.jpg?.image_url} alt={char.character?.name}
                          className="w-10 h-10 rounded-full object-cover shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{char.character?.name}</p>
                          <p className="text-[10px] text-text-muted capitalize">{char.role?.toLowerCase()}</p>
                          {va && <p className="text-[10px] text-text-muted truncate">{va.person?.name}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:w-80 shrink-0 space-y-4">
            <div className="p-4 rounded-2xl bg-surface border border-border">
              <h3 className="text-sm font-semibold mb-3">Information</h3>
              <div className="space-y-2">
                {media.studios?.nodes?.length > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Studio</span>
                    <span>{media.studios.nodes.filter((s: any) => s.isAnimationStudio)[0]?.name || media.studios.nodes[0]?.name}</span>
                  </div>
                )}
                {media.season && media.seasonYear && (
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Season</span>
                    <span className="capitalize">{media.season.toLowerCase()} {media.seasonYear}</span>
                  </div>
                )}
                {media.startDate && (
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Aired</span>
                    <span>{media.startDate.month}/{media.startDate.day}/{media.startDate.year}</span>
                  </div>
                )}
                {media.popularity && (
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Popularity</span>
                    <span>#{media.popularity.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Add */}
            <div className="sm:hidden w-full">
              <img src={media.coverImage?.large} alt={title} className="w-full rounded-xl" />
            </div>

            {media.siteUrl && (
              <a href={media.siteUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-surface border border-border text-sm text-text-secondary hover:text-primary hover:border-primary/30 transition-colors">
                <ExternalLink className="w-4 h-4" /> View on AniList
              </a>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
