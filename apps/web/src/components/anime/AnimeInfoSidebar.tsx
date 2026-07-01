"use client";

import DOMPurify from "isomorphic-dompurify";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Play,
  Calendar,
  Clock,
  BookOpen,
  Users,
  Tv,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Hash,
} from "lucide-react";
import { anilist } from "@/lib/anime/anilist";
import { jikan } from "@/lib/anime/jikan";
import { cn } from "@/lib/utils";

interface AnimeInfoSidebarProps {
  animeTitle: string | null;
  mediaId: number | null;
  currentEpisode: number | null;
  onSetEpisode?: (mediaId: number, episode: number) => void;
  onDetectFromUrl?: (url: string) => void;
}

export function AnimeInfoSidebar({
  animeTitle,
  mediaId,
  currentEpisode,
  onSetEpisode,
  onDetectFromUrl,
}: AnimeInfoSidebarProps) {
  const [media, setMedia] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "info" | "episodes" | "characters"
  >("info");
  const [characters, setCharacters] = useState<any[]>([]);
  const [themes, setThemes] = useState<{
    openings: string[];
    endings: string[];
  } | null>(null);

  const fetchData = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const { Media } = await anilist.detail(id);
      setMedia(Media);

      if (Media.idMal) {
        try {
          const [eps, chars, thms] = await Promise.all([
            jikan.episodes(Media.idMal).catch(() => []),
            jikan.characters(Media.idMal).catch(() => []),
            jikan.themes(Media.idMal).catch(() => null),
          ]);
          setEpisodes(Array.isArray(eps) ? eps : []);
          setCharacters(Array.isArray(chars) ? chars.slice(0, 8) : []);
          setThemes(thms);
        } catch {}
      }
    } catch (error) {
      console.error("Failed to fetch anime info:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mediaId) fetchData(mediaId);
  }, [mediaId, fetchData]);

  const detectFromChat = () => {
    if (!animeTitle) return;
    anilist.guess(animeTitle).then(({ Page }) => {
      if (Page.media.length > 0) fetchData(Page.media[0].id);
    });
  };

  if (!media && !loading && animeTitle) {
    return (
      <div className="p-4 text-center">
        <p className="text-text-muted text-sm mb-2">No anime detected</p>
        <button
          onClick={detectFromChat}
          className="px-3 py-2 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors"
        >
          Detect from title
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!media) return null;

  const coverUrl = media.coverImage?.large || media.coverImage?.medium;
  const title =
    media.title?.english ||
    media.title?.romaji ||
    media.title?.native ||
    "Unknown";
  const score = media.averageScore
    ? (media.averageScore / 10).toFixed(1)
    : null;
  const nextEpisode = media.nextAiringEpisode;

  return (
    <div className="flex flex-col h-full">
      <div className="relative h-40 shrink-0 overflow-hidden">
        {media.bannerImage ? (
          <img
            src={media.bannerImage}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent-cyan/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex items-end gap-3">
          <div className="w-14 h-20 rounded-lg overflow-hidden shadow-lg shrink-0 border border-border/50">
            <img
              src={coverUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold truncate text-white drop-shadow-lg">
              {title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {score && (
                <span className="flex items-center gap-1 text-xs text-yellow-400">
                  <Star className="w-3 h-3 fill-yellow-400" />
                  {score}
                </span>
              )}
              {media.format && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-text-secondary uppercase">
                  {media.format}
                </span>
              )}
              {media.episodes && (
                <span className="text-[10px] text-text-muted">
                  {media.episodes} eps
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-border shrink-0">
        {(["info", "episodes", "characters"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 text-xs font-medium transition-colors uppercase tracking-wider",
              activeTab === tab
                ? "text-primary border-b-2 border-primary"
                : "text-text-muted hover:text-text-secondary",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === "info" && (
            <motion.div
              key="info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-3 space-y-3"
            >
              {media.genres && media.genres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {media.genres.slice(0, 5).map((g) => (
                    <span
                      key={g}
                      className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {media.description && (
                <div>
                  <p
                    className={cn(
                      "text-xs text-text-secondary leading-relaxed",
                      !showFullDescription && "line-clamp-4",
                    )}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(
                        media.description.replace(/<br\s*\/?>/gi, " "),
                      ),
                    }}
                  />
                  {media.description.length > 200 && (
                    <button
                      onClick={() =>
                        setShowFullDescription(!showFullDescription)
                      }
                      className="text-xs text-primary mt-1 hover:underline"
                    >
                      {showFullDescription ? "Show less" : "Read more"}
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {media.status && (
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <Tv className="w-3 h-3" />
                    <span className="capitalize">
                      {media.status.toLowerCase().replace(/_/g, " ")}
                    </span>
                  </div>
                )}
                {media.season && media.seasonYear && (
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {media.season.charAt(0) +
                        media.season.slice(1).toLowerCase()}{" "}
                      {media.seasonYear}
                    </span>
                  </div>
                )}
                {media.duration && (
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <Clock className="w-3 h-3" />
                    <span>{media.duration} min/ep</span>
                  </div>
                )}
                {media.episodes && (
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <BookOpen className="w-3 h-3" />
                    <span>{media.episodes} episodes</span>
                  </div>
                )}
              </div>

              {media.studios?.nodes && media.studios.nodes.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase text-text-muted tracking-wider mb-1">
                    Studio
                  </p>
                  <p className="text-xs">
                    {media.studios.nodes.filter((s) => s.isAnimationStudio)[0]
                      ?.name || media.studios.nodes[0]?.name}
                  </p>
                </div>
              )}

              {nextEpisode && (
                <div className="p-2 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20">
                  <p className="text-xs text-accent-cyan font-medium">
                    Ep {nextEpisode.episode} airs in{" "}
                    {Math.floor(nextEpisode.timeUntilAiring / 3600)}h{" "}
                    {Math.floor((nextEpisode.timeUntilAiring % 3600) / 60)}m
                  </p>
                </div>
              )}

              {currentEpisode && (
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-primary font-medium flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    Currently watching: Episode {currentEpisode}
                  </p>
                </div>
              )}

              {onSetEpisode && media.episodes && (
                <button
                  onClick={() => onSetEpisode(media.id, 1)}
                  className="w-full py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors"
                >
                  Start from Episode 1
                </button>
              )}

              {media.siteUrl && (
                <a
                  href={media.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 text-xs text-text-muted hover:text-primary transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> View on AniList
                </a>
              )}
            </motion.div>
          )}

          {activeTab === "episodes" && (
            <motion.div
              key="episodes"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <button
                onClick={() => setShowEpisodes(!showEpisodes)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-text-muted hover:text-text-secondary transition-colors border-b border-border"
              >
                <span>
                  Episode List ({episodes.length || media.episodes || "?"})
                </span>
                {showEpisodes ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
              <div className="max-h-60 overflow-y-auto">
                {(showEpisodes ? episodes : episodes.slice(0, 10)).map(
                  (ep: any, i: number) => (
                    <button
                      key={ep.mal_id || i}
                      onClick={() =>
                        onSetEpisode?.(
                          media.id,
                          ep.mal_id ? parseInt(ep.mal_id) : i + 1,
                        )
                      }
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-surface-light transition-colors border-b border-border/50",
                        (ep.mal_id ? parseInt(ep.mal_id) : i + 1) ===
                          currentEpisode && "bg-primary/10",
                      )}
                    >
                      <span className="w-6 h-6 rounded-full bg-surface-light flex items-center justify-center text-[10px] text-text-muted shrink-0">
                        {ep.mal_id || i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs truncate">
                          {ep.title || `Episode ${ep.mal_id || i + 1}`}
                        </p>
                        {ep.air_date && (
                          <p className="text-[10px] text-text-muted">
                            {new Date(ep.air_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {ep.thumbnail && (
                        <img
                          src={ep.thumbnail}
                          alt=""
                          className="w-10 h-6 rounded object-cover shrink-0"
                        />
                      )}
                    </button>
                  ),
                )}
              </div>
              {!showEpisodes && episodes.length > 10 && (
                <button
                  onClick={() => setShowEpisodes(true)}
                  className="w-full py-2 text-xs text-primary hover:underline text-center"
                >
                  Show all {episodes.length} episodes
                </button>
              )}
            </motion.div>
          )}

          {activeTab === "characters" && (
            <motion.div
              key="characters"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-2 space-y-2"
            >
              {characters.length === 0 && (
                <p className="text-xs text-text-muted text-center py-4">
                  No character data available
                </p>
              )}
              {characters.map((char: any, i: number) => {
                const va = char.voice_actors?.[0];
                return (
                  <div
                    key={char.character?.mal_id || i}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-light transition-colors"
                  >
                    <img
                      src={char.character?.images?.jpg?.image_url}
                      alt={char.character?.name}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">
                        {char.character?.name}
                      </p>
                      <p className="text-[10px] text-text-muted capitalize">
                        {char.role?.toLowerCase()}
                      </p>
                    </div>
                    {va && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <img
                          src={va.person?.images?.jpg?.image_url}
                          alt={va.person?.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="text-[10px] text-text-muted hidden md:inline truncate max-w-[60px]">
                          {va.person?.name}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {themes && (themes.openings.length > 0 || themes.endings.length > 0) && (
        <div className="border-t border-border p-3 shrink-0">
          {themes.openings.length > 0 && (
            <div className="mb-1">
              <span className="text-[10px] uppercase text-text-muted tracking-wider">
                OP
              </span>
              <p className="text-xs truncate" title={themes.openings[0]}>
                {themes.openings[0]}
              </p>
            </div>
          )}
          {themes.endings.length > 0 && (
            <div>
              <span className="text-[10px] uppercase text-text-muted tracking-wider">
                ED
              </span>
              <p className="text-xs truncate" title={themes.endings[0]}>
                {themes.endings[0]}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
