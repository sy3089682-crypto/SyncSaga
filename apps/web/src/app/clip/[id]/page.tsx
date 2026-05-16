'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Film, Clock, Eye, Share2, Play, ArrowLeft, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/ui/Loading';

export default function ClipPage() {
  const params = useParams();
  const [clip, setClip] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>(`/api/clips/${params.id}`)
      .then(data => setClip(data.clip))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (!clip) return <div className="min-h-screen bg-background flex items-center justify-center text-text-secondary">Clip not found</div>;

  const duration = clip.end_time - clip.start_time;

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="aspect-video rounded-2xl bg-surface border border-border flex items-center justify-center mb-6 relative group">
            <div className="absolute inset-0 flex items-center justify-center">
              <button className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center hover:bg-primary transition-colors group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-white ml-1" />
              </button>
            </div>
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur text-sm flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur text-sm flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                {clip.view_count}
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-2">{clip.title || 'Untitled Clip'}</h1>
          <div className="flex items-center gap-3 text-sm text-text-secondary mb-6">
            <span className="flex items-center gap-1"><Film className="w-4 h-4" />{clip.anime_title}</span>
            {clip.episode_number && <span>Episode {clip.episode_number}</span>}
            <span>by @{clip.profiles?.username || 'user'}</span>
          </div>

          {clip.description && (
            <p className="text-text-secondary mb-6">{clip.description}</p>
          )}

          <div className="flex gap-3">
            <button className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors flex items-center gap-2">
              <Play className="w-5 h-5" />
              Watch Full Episode
            </button>
            <button className="px-6 py-3 rounded-xl bg-surface-light border border-border text-text-primary font-semibold hover:border-primary/50 transition-colors flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Share
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
