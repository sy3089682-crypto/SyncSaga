import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Clock, ChevronRight, ExternalLink, X } from 'lucide-react';
import { useWatchProgress } from '@/hooks/useWatchProgress';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { ContinueWatchingItem } from '@syncsaga/shared';

export function ContinueWatching() {
  const { continueWatching, loading, fetchContinueWatching } = useWatchProgress();
  const [items, setItems] = useState<typeof continueWatching>([]);

  useEffect(() => {
    fetchContinueWatching(10);
  }, [fetchContinueWatching]);

  useEffect(() => {
    setItems(continueWatching);
  }, [continueWatching]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `\${hrs}h \${mins}m`;
    return `\${mins}m \${secs}s`;
  };

  const formatProgress = (progress: number) => {
    return Math.round(progress);
  };

  const handleResume = async (item: ContinueWatchingItem) => {
    // Navigate to room or anime page with resume
    // For now, navigate to room if room_id exists, otherwise to discover/search
    if (item.room_id) {
      window.location.href = `/room/\${item.room_id}`;
    } else {
      // Navigate to discover with anime pre-selected
      window.location.href = `/discover?anime=\${item.anime_id}&episode=\${item.episode}`;
    }
  };

  const handleRemove = (animeId: number, episode: number) => {
    // Would call deleteProgress hook
    console.log('Remove from continue watching:', animeId, episode);
  };

  if (loading && items.length === 0) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-ink">Continue Watching</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <ContinueWatchingSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="text-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <Clock className="w-12 h-12 mx-auto text-ink-mute" />
          <div>
            <h3 className="text-lg font-medium text-ink">Nothing to continue</h3>
            <p className="text-sm text-ink-mute mt-1">
              Start watching an anime to see your progress here
            </p>
          </div>
          <Button variant="primary" size="md" onClick={() => window.location.href = '/discover'}>
            Browse Anime
          </Button>
        </motion.div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-ink">Continue Watching</h2>
        <span className="text-sm text-ink-mute">{items.length} in progress</span>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <ContinueWatchingCard
              key={`\${item.anime_id}-\${item.episode}-\${item.season}`}
              item={item}
              onResume={handleResume}
              onRemove={handleRemove}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ContinueWatchingCard({
  item,
  onResume,
  onRemove,
}: {
  item: ContinueWatchingItem;
  onResume: (item: ContinueWatchingItem) => void;
  onRemove: (animeId: number, episode: number) => void;
}) {
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `\${hrs}h \${mins}m`;
    const secs = Math.floor(seconds % 60);
    return `\${mins}m \${secs}s`;
  };

  const progress = Math.round(item.progress);

  return (
    <Card
      className="relative group overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-[0_0_20px_2px_var(--amber-glow)]"
      onClick={() => onResume(item)}
      padding="none"
    >
      <div className="relative aspect-video overflow-hidden">
        {item.anime_cover_url ? (
          <img
            src={item.anime_cover_url}
            alt={item.anime_title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-surface flex items-center justify-center">
            <span className="text-ink-mute text-sm">No Image</span>
          </div>
        )}
        
        {/* Progress overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/50">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `\${item.progress}%` }}
            transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
            className="h-full bg-amber relative"
          >
            <div className="absolute top-[-8px] right-[-4px] w-2 h-2 bg-amber rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        </div>

        {/* Play button overlay */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
          onClick={(e) => { e.stopPropagation(); }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-14 h-14 rounded-full bg-amber flex items-center justify-center text-canvas shadow-lg"
          >
            <Play className="w-6 h-6 ml-1" />
          </motion.div>
        </motion.button>

        {/* Progress text */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3">
          <span className="text-xs font-medium text-canvas bg-black/60 px-2 py-1 rounded">
            Ep {item.episode}{item.season > 1 ? ` S\${item.season}` : ''}
          </span>
          <span className="text-xs font-medium text-canvas bg-black/60 px-2 py-1 rounded">
            {Math.round(item.progress)}%
          </span>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-ink truncate">{item.anime_title}</h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-ink-mute">
              <span className="font-medium">Ep {item.episode}</span>
              {item.season > 1 && <span>· S{item.season}</span>}
              <span>·</span>
              <span>{Math.round(item.timestamp / 60)}m watched</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => { e.stopPropagation(); }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `\${Math.min(100, item.progress)}%` }}
              transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
              className="h-full bg-amber"
            />
          </div>
          <span className="text-xs font-medium text-ink-mute w-10 text-right">
            {Math.round(item.progress)}%
          </span>
        </div>
      </div>
    </Card>
  );
}

function ContinueWatchingSkeleton() {
  return (
    <Card className="overflow-hidden" padding="none">
      <div className="aspect-video bg-surface animate-pulse" />
      <div className="p-3 space-y-3">
        <div className="h-4 w-3/4 bg-surface animate-pulse rounded" />
        <div className="h-3 w-1/2 bg-surface animate-pulse rounded" />
        <div className="h-1.5 bg-surface animate-pulse rounded w-full" />
      </div>
    </Card>
  );
}

export default ContinueWatching;
