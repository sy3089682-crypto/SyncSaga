'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, MessageSquare, Mic, MicOff, PhoneOff, Send, Smile,
  Play, Pause, Settings, Crown, Volume2, WifiOff, Bell, Tv,
  Monitor, ChevronLeft, Maximize2, Minimize2,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useRoom } from '@/hooks/useRoom';
import { getSocket } from '@/lib/socket';
import { cn, formatTime } from '@/lib/utils';
import { VirtualCinema, CinemaOverlay } from '@/components/cinema/VirtualCinema';
import { TimelineReactions, ReactionBar } from '@/components/cinema/TimelineReactions';
import { ClipCapture } from '@/components/cinema/ClipCapture';
import { FriendsFeed } from '@/components/cinema/FriendsFeed';
import { TasteGraph } from '@/components/cinema/TasteGraph';
import { AiRecap } from '@/components/cinema/AiRecap';
import { AnimeInfoSidebar } from '@/components/anime/AnimeInfoSidebar';
import { EpisodePicker } from '@/components/anime/EpisodePicker';
import { MobileRoom } from '@/components/mobile/MobileRoom';
import { isMobile } from '@/hooks/useMobileHost';
import { useMemberProfiles, memberLabel } from '@/hooks/useMemberProfiles';

interface TimelineReaction {
  id: string;
  user_id: string;
  username: string;
  timestamp_sec: number;
  type: string;
  content?: string;
}

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.id as string;
  const isMobileDevice = searchParams.get('mobile') === 'true' || isMobile();
  const { user, addMessage, driftStatuses, setDriftStatus } = useAppStore();
  const { currentRoom, messages, roomMembers, join, leave, sendMessage, sendTyping, sendSyncEvent } = useRoom(roomId);

  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'users' | 'anime'>('chat');
  const [playbackState, setPlaybackState] = useState<'playing' | 'paused'>('paused');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSidebar, setShowSidebar] = useState(!isMobileDevice);
  const [showFeed, setShowFeed] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isInVoice, setIsInVoice] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [timelineReactions, setTimelineReactions] = useState<TimelineReaction[]>([]);
  const [cinemaMode, setCinemaMode] = useState<'flat' | 'cinema' | 'immersive'>('flat');
  const [episode, setEpisode] = useState<string | null>('Attack on Titan S4 E5');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    join();
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onSync = (event: any) => {
      if (event.type === 'play') setPlaybackState('playing');
      if (event.type === 'pause') setPlaybackState('paused');
      if (event.type === 'seek') setCurrentTime(event.timestamp);
      if (event.type === 'episode') setEpisode(event.episode);
    };
    const onState = (state: any) => {
      setCurrentTime(state.timestamp);
      setPlaybackState(state.playback_state);
      if (state.episode) setEpisode(state.episode);
    };
    const onTyping = (data: { userId: string; isTyping: boolean }) => {
      if (data.isTyping) {
        setTypingUsers(prev => prev.includes(data.userId) ? prev : [...prev, data.userId]);
        setTimeout(() => setTypingUsers(prev => prev.filter(id => id !== data.userId)), 3000);
      } else {
        setTypingUsers(prev => prev.filter(id => id !== data.userId));
      }
    };
    const onReaction = (r: TimelineReaction) => setTimelineReactions(prev => [...prev, r]);

    let socket: Awaited<ReturnType<typeof getSocket>> | null = null;
    const onMessage = (msg: any) => addMessage(msg);
    const onVoiceJoined = () => setIsInVoice(true);
    const onVoiceLeft = () => setIsInVoice(false);
    let cancelled = false;
    getSocket().then((sock) => {
      if (cancelled) return;
      socket = sock;
      sock.on('connect', onConnect);
      sock.on('disconnect', onDisconnect);
      sock.on('sync:event', onSync);
      sock.on('sync:state', onState);
      sock.on('chat:message', onMessage);
      sock.on('chat:typing', onTyping);
      sock.on('reaction:new', onReaction);
      sock.on('voice:joined', onVoiceJoined);
      sock.on('voice:left', onVoiceLeft);
    }).catch(() => {});
    const onDriftUpdate = (data: { userId: string; drift: number; status: 'synced' | 'slight' | 'desynced' }) => {
      setDriftStatus(data.userId, { drift: data.drift, status: data.status });
    };
    const onNewHost = (data: { newHostId: string }) => {
      if (data.newHostId === user?.id) {
        setEpisode(prev => prev);
      }
    };
    getSocket().then((sock) => {
      if (cancelled) return;
      sock.on('sync:drift_update', onDriftUpdate);
      sock.on('room:new_host', onNewHost);
    }).catch(() => {});

    return () => {
      cancelled = true;
      leave();
      if (socket) {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('sync:event', onSync);
        socket.off('sync:state', onState);
        socket.off('chat:typing', onTyping);
        socket.off('reaction:new', onReaction);
        socket.off('sync:drift_update', onDriftUpdate);
        socket.off('room:new_host', onNewHost);
        socket.off('chat:message', onMessage);
        socket.off('voice:joined', onVoiceJoined);
        socket.off('voice:left', onVoiceLeft);
      }
    };
  }, [roomId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (playbackState !== 'playing' || duration === 0) return;
    const interval = setInterval(() => setCurrentTime(t => Math.min(t + 0.5, duration)), 500);
    return () => clearInterval(interval);
  }, [playbackState, duration]);

  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content) return;
    setInput('');
    getSocket().then((sock) => sock.emit('chat:message', { roomId, content, type: 'text' })).catch(() => {});
  }, [input, roomId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const toggleVoice = () => {
    setIsInVoice(!isInVoice);
    getSocket().then((sock) => sock.emit(isInVoice ? 'voice:leave' : 'voice:join', { roomId })).catch(() => {});
  };

  const isHost = currentRoom?.host_id === user?.id;
  const totalMembers = roomMembers.length + 1;
  const memberProfiles = useMemberProfiles(roomMembers.map((m) => m.user_id));

  if (isMobileDevice) {
    return <MobileRoom roomId={roomId} />;
  }

  return (
    <div className="h-screen bg-canvas text-ink flex overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 sm:h-14 border-b border-border glass flex items-center justify-between px-3 sm:px-4 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={cn("w-2 h-2 rounded-full shrink-0", isConnected ? 'bg-success' : 'bg-red-500')} />
            <h1 className="font-semibold truncate text-sm sm:text-base">{currentRoom?.name || `Room ${roomId.slice(0, 8)}`}</h1>
            <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface text-xs text-ink-soft">
              <Users className="w-3 h-3" />
              {totalMembers}
            </span>
            {isHost && <Crown className="w-4 h-4 text-amber shrink-0" />}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {currentRoom?.anime_media_id && isHost && (
              <EpisodePicker
                mediaId={currentRoom.anime_media_id}
                currentEpisode={currentRoom.current_episode_number}
                onSelect={(mediaId, ep) => {
                  setEpisode(`Episode ${ep}`);
                  getSocket().then((sock) => sock.emit('anime:set_episode', { roomId, mediaId, episode: ep })).catch(() => {});
                }}
              />
            )}
            {episode && (
              <span className="hidden md:flex text-[10px] text-ink-mute px-2 py-1 rounded bg-surface truncate max-w-[150px]">
                {episode}
              </span>
            )}
            {!isConnected && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-error/15 text-error text-xs">
                <WifiOff className="w-3 h-3" />
                Reconnecting
              </span>
            )}
            <FriendsFeed collapsed={!showFeed} onToggle={() => setShowFeed(!showFeed)} />
            <AiRecap roomId={roomId} animeTitle={currentRoom?.anime_title ?? null} episodeNumber={currentRoom?.current_episode_number ?? null} />
            <button onClick={() => setShowSidebar(!showSidebar)}
              className={cn("p-2 rounded-lg transition-colors", showSidebar ? 'bg-amber-strong text-amber' : 'hover:bg-surface text-ink-soft')}>
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button className="p-2 rounded-lg hover:bg-surface text-ink-soft transition-colors">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-2 sm:p-4 relative overflow-hidden">
          <CinemaOverlay mode={cinemaMode}>
            <div className="w-full h-full max-w-5xl max-h-[60vh] bg-surface rounded-xl border border-border relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center px-4">
                  <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 3 }}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-strong flex items-center justify-center mx-auto mb-4">
                    <Play className="w-8 h-8 sm:w-10 sm:h-10 text-amber" />
                  </motion.div>
                  <h3 className="text-base sm:text-lg font-semibold mb-1">Ready to Watch</h3>
                  <p className="text-ink-soft text-xs sm:text-sm max-w-xs sm:max-w-md mx-auto">
                    Open your anime with the SyncSaga extension installed.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-ink-mute">
                    <Monitor className="w-3 h-3" />
                    <span>Host from mobile: use browser share or paste URL</span>
                  </div>
                </div>
              </div>

              <div className="absolute top-0 left-0 right-0">
                <ReactionBar reactions={timelineReactions} duration={duration} />
              </div>

              <AnimatePresence>
                {timelineReactions.slice(-5).map((r, i) => {
                  const emojis: Record<string, string> = { laugh: '😂', cry: '😭', shock: '😱', fire: '🔥', heart: '❤️', gg: '🎉' };
                  return (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 1, y: 0, scale: 0.5 }}
                      animate={{ opacity: 0, y: -100, scale: 1.2 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 2, delay: i * 0.1 }}
                      className="absolute bottom-1/2 text-3xl pointer-events-none z-20"
                      style={{ left: `${20 + Math.random() * 60}%` }}
                    >
                      {emojis[r.type] || '🔥'}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button onClick={() => {
                      const next = playbackState === 'playing' ? 'paused' : 'playing';
                      setPlaybackState(next);
                      sendSyncEvent({ type: next === 'playing' ? 'play' : 'pause', timestamp: currentTime });
                    }}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-elevated hover:bg-white/20 flex items-center justify-center transition-colors shrink-0">
                      {playbackState === 'playing' ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                    <ClipCapture roomId={roomId} currentTime={currentTime} episode={episode || undefined} />
                    <TimelineReactions
                      roomId={roomId}
                      currentTime={currentTime}
                      reactions={timelineReactions}
                      onReactionAdd={r => setTimelineReactions(prev => [...prev, r])}
                    />
                  </div>

                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs text-ink-soft w-10 text-right shrink-0">{formatTime(currentTime)}</span>
                    <div className="flex-1 h-1.5 bg-white/15 rounded-full overflow-hidden cursor-pointer group relative">
                      <div className="h-full bg-gradient-to-r from-amber to-amber rounded-full group-hover:h-2 transition-all" style={{ width: `${(currentTime / duration) * 100}%` }} />
                    </div>
                    <span className="text-xs text-ink-soft w-10 shrink-0">{formatTime(duration)}</span>
                  </div>

                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-ink-soft shrink-0" />
                </div>
              </div>
            </div>
          </CinemaOverlay>
        </div>

        <div className="h-14 sm:h-16 border-t border-border glass flex items-center justify-between px-3 sm:px-4 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            {isInVoice && roomMembers.slice(0, 4).map(m => (
              <div key={m.user_id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface text-xs">
                <div className={cn("w-2 h-2 rounded-full", m.user_id === user?.id ? 'bg-success' : 'bg-text-muted')} />
                <span className="truncate max-w-[60px]">{m.user_id === user?.id ? 'You' : m.user_id.slice(0, 4)}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <VirtualCinema
              isActive={true}
              mode={cinemaMode}
              onModeChange={setCinemaMode}
              participantCount={totalMembers}
            />
            <button onClick={() => setIsMuted(!isMuted)}
              className={cn("p-2.5 sm:p-3 rounded-lg transition-colors", isMuted ? 'bg-error/15 text-error' : 'bg-surface hover:bg-surface text-ink-soft')}>
              {isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <button onClick={toggleVoice}
              className={cn("px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm transition-colors", isInVoice ? 'bg-error/15 text-error hover:bg-red-500/30' : 'bg-success/20 text-success hover:bg-success/30')}>
              <span className="flex items-center gap-1.5 sm:gap-2">
                {isInVoice ? <><PhoneOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Leave</> : <><Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Join Voice</>}
              </span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-l border-border bg-surface flex flex-col overflow-hidden hidden sm:flex"
          >
            <div className="flex border-b border-border shrink-0">
              {(['chat', 'users', 'anime'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={cn("flex-1 py-3 text-sm font-medium transition-colors relative", activeTab === tab ? 'text-amber' : 'text-ink-soft hover:text-ink')}>
                  <span className="flex items-center justify-center gap-1.5">
                    {tab === 'chat' ? <MessageSquare className="w-4 h-4" /> : tab === 'users' ? <Users className="w-4 h-4" /> : <Tv className="w-4 h-4" />}
                    {tab === 'chat' ? 'Chat' : tab === 'users' ? `Users (${totalMembers})` : 'Anime'}
                  </span>
                </button>
              ))}
            </div>

            {activeTab === 'anime' ? (
              <div className="flex-1 overflow-y-auto min-h-0">
                <AnimeInfoSidebar
                  animeTitle={episode}
                  mediaId={currentRoom?.anime_media_id || null}
                  currentEpisode={currentRoom?.current_episode_number || null}
                  onSetEpisode={(mediaId, ep) => {
                    sendSyncEvent({ type: 'episode', timestamp: 0, episode: `Episode ${ep}` });
                  }}
                />
              </div>
            ) : activeTab === 'chat' ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {messages.length === 0 && (
                    <div className="text-center text-ink-mute text-sm py-8">No messages yet. Say hello!</div>
                  )}
                  {messages.map(msg => (
                    <div key={msg.id}>
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-amber-strong flex items-center justify-center text-xs font-semibold shrink-0">
                          {(msg as any).sender?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-amber">{(msg as any).sender?.username || 'User'}</span>
                            <span className="text-[10px] text-ink-mute">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-sm text-ink break-words">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {typingUsers.length > 0 && (
                    <div className="text-xs text-ink-mute italic">{typingUsers.length} user{typingUsers.length > 1 ? 's' : ''} typing...</div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-3 border-t border-border shrink-0">
                  <div className="flex items-center gap-2 bg-surface rounded-lg px-3 py-2">
                    <button className="text-ink-mute hover:text-ink-soft transition-colors shrink-0"><Smile className="w-5 h-5" /></button>
                    <input type="text" value={input} onChange={e => { setInput(e.target.value); sendTyping(e.target.value.length > 0); }}
                      onKeyDown={handleKeyDown} placeholder="Type a message..." maxLength={2000}
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-mute min-w-0" />
                    <button onClick={handleSend} disabled={!input.trim()}
                      className="text-amber hover:text-amber-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0">
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-strong">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber to-amber-hover flex items-center justify-center text-sm font-semibold shrink-0">
                    {(user as any)?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{(user as any)?.username || 'You'}</p>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-success">
                        <span className="w-1.5 h-1.5 rounded-full bg-success" />Online
                      </span>
                      {(() => {
                        const ds = driftStatuses[user?.id || ''];
                        if (!ds) return null;
                        const dc = ds.status === 'synced' ? 'bg-success' : ds.status === 'slight' ? 'bg-yellow-500' : 'bg-red-500';
                        const tc = ds.status === 'synced' ? 'text-success' : ds.status === 'slight' ? 'text-amber' : 'text-error';
                        return <span className={`flex items-center gap-1 text-xs ${tc}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dc}`} />
                          {ds.status === 'synced' ? 'In Sync' : ds.status === 'slight' ? 'Slight Drift' : 'Desynced'}
                        </span>;
                      })()}
                    </div>
                  </div>
                  {isHost && <Crown className="w-4 h-4 text-amber ml-auto shrink-0" />}
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-ink-mute uppercase tracking-wider mb-2 px-1">In Room — {totalMembers}</p>
                  {roomMembers.map(m => {
                    const ds = driftStatuses[m.user_id];
                    const dc = !ds ? 'bg-text-muted' : ds.status === 'synced' ? 'bg-success' : ds.status === 'slight' ? 'bg-yellow-500' : 'bg-red-500';
                    const profile = memberProfiles[m.user_id];
                    const name = memberLabel(m.user_id, profile);
                    return (
                      <div key={m.user_id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface transition-colors">
                        <div className="relative">
                          {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-sm font-semibold shrink-0">
                              {name[0]?.toUpperCase()}
                            </div>
                          )}
                          {ds && (
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${dc} border-2 border-surface`} title={`Drift: ${ds.drift.toFixed(2)}s`} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm truncate">{name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-ink-mute">{m.role === 'host' ? 'Host' : m.role === 'co_host' ? 'Co-Host' : 'Member'}</p>
                            {ds && (
                              <span className={cn('text-[10px]', ds.status === 'synced' ? 'text-success' : ds.status === 'slight' ? 'text-amber' : 'text-error')}>
                                {ds.status === 'synced' ? 'Synced' : `${ds.drift.toFixed(1)}s`}
                              </span>
                            )}
                          </div>
                        </div>
                        {m.role === 'host' && <Crown className="w-3.5 h-3.5 text-amber ml-auto shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3">
                  <TasteGraph onSelect={(title) => setEpisode(title)} />
                </div>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFeed && (
          <FriendsFeed collapsed={false} onToggle={() => setShowFeed(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
