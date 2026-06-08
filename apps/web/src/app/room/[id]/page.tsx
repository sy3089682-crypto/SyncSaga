'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  Users, MessageSquare, Mic, MicOff, PhoneOff, Send, Smile,
  Play, Pause, Settings, Crown, Volume2, WifiOff, Bell, Tv,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { LiveKitRoom, RoomAudioRenderer, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { useVirtualizer } from '@tanstack/react-virtual';
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
  const roomId = params.id as string;
  const { user } = useAppStore();
  const { currentRoom, messages, roomMembers, join, leave, sendMessage, sendTyping, sendSyncEvent } = useRoom(roomId);
  const { driftStatuses, setDriftStatus } = useAppStore();

  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'users' | 'anime'>('chat');
  const [playbackState, setPlaybackState] = useState<'playing' | 'paused'>('paused');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showFeed, setShowFeed] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isInVoice, setIsInVoice] = useState(false);
  const [liveKitToken, setLiveKitToken] = useState("");
  const [liveKitUrl, setLiveKitUrl] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [timelineReactions, setTimelineReactions] = useState<TimelineReaction[]>([]);
  const [cinemaMode, setCinemaMode] = useState<'flat' | 'cinema' | 'immersive'>('flat');
  const [episode, setEpisode] = useState<string | null>('Attack on Titan S4 E5');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => chatContainerRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  useEffect(() => {
    if (chatContainerRef.current && messages.length > 0) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    join();
    const socket = getSocket();
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

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('sync:event', onSync);
    socket.on('sync:state', onState);
    socket.on('chat:typing', onTyping);
    socket.on('reaction:new', onReaction);
    const onDriftUpdate = (data: { userId: string; drift: number; status: 'synced' | 'slight' | 'desynced' }) => {
      setDriftStatus(data.userId, { drift: data.drift, status: data.status });
    };
    const onNewHost = (data: { newHostId: string }) => {
      if (data.newHostId === user?.id) {
        setEpisode(prev => prev); // Force re-render
      }
    };
    socket.on('sync:drift_update', onDriftUpdate);
    socket.on('room:new_host', onNewHost);

    return () => {
      leave();
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('sync:event', onSync);
      socket.off('sync:state', onState);
      socket.off('chat:typing', onTyping);
      socket.off('reaction:new', onReaction);
      socket.off('sync:drift_update', onDriftUpdate);
      socket.off('room:new_host', onNewHost);
    };
  }, [roomId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (playbackState !== 'playing' || duration === 0) return;
    const interval = setInterval(() => setCurrentTime(t => Math.min(t + 0.5, duration)), 500);
    return () => clearInterval(interval);
  }, [playbackState, duration]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
  }, [input, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const toggleVoice = async () => {
    if (isInVoice) {
      setIsInVoice(false);
      setLiveKitToken('');
      getSocket().emit('voice:leave' as any, { roomId });
    } else {
      try {
        const { api } = await import('@/lib/api');
        const tokenStr = localStorage.getItem('token');
        if (!tokenStr) return;
        const res = await api.post<{token: string; url: string}>('/api/livekit/token', {
          roomName: roomId,
          isHost: currentRoom?.host_id === user?.id
        }, tokenStr);
        setLiveKitToken(res.token);
        setLiveKitUrl(res.url);
        setIsInVoice(true);
        getSocket().emit('voice:join' as any, { roomId });
      } catch (err) {
        console.error('Failed to join voice:', err);
      }
    }
  };

  const isHost = currentRoom?.host_id === user?.id;
  const totalMembers = roomMembers.length + 1;

  return (
    <div className="h-screen bg-background text-text-primary flex overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-12 sm:h-14 border-b border-border glass flex items-center justify-between px-3 sm:px-4 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={cn("w-2 h-2 rounded-full shrink-0", isConnected ? 'bg-accent-green' : 'bg-red-500')} />
            <h1 className="font-semibold truncate text-sm sm:text-base">{currentRoom?.name || `Room ${roomId.slice(0, 8)}`}</h1>
            <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface text-xs text-text-secondary">
              <Users className="w-3 h-3" />
              {totalMembers}
            </span>
            {isHost && <Crown className="w-4 h-4 text-yellow-500 shrink-0" />}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {currentRoom?.anime_id && isHost && (
              <EpisodePicker
                mediaId={currentRoom.anime_id}
                currentEpisode={currentRoom.episode_number}
                onSelect={(mediaId, ep) => {
                  setEpisode(`Episode ${ep}`);
                  getSocket().emit('anime:set_episode' as any, { roomId, mediaId, episode: ep });
                }}
              />
            )}
            {episode && (
              <span className="hidden md:flex text-[10px] text-text-muted px-2 py-1 rounded bg-surface-light truncate max-w-[150px]">
                {episode}
              </span>
            )}
            {!isConnected && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 text-red-500 text-xs">
                <WifiOff className="w-3 h-3" />
                Reconnecting
              </span>
            )}
            <FriendsFeed collapsed={!showFeed} onToggle={() => setShowFeed(!showFeed)} />
            <AiRecap roomId={roomId} animeTitle={currentRoom?.anime_title || undefined} episodeNumber={currentRoom?.episode_number || undefined} />
            <button onClick={() => setShowSidebar(!showSidebar)}
              className={cn("p-2 rounded-lg transition-colors", showSidebar ? 'bg-primary/20 text-primary' : 'hover:bg-surface-light text-text-secondary')}>
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button className="p-2 rounded-lg hover:bg-surface-light text-text-secondary transition-colors">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </header>

        {/* Video / Sync Area */}
        <div className="flex-1 flex items-center justify-center p-2 sm:p-4 relative overflow-hidden">
          <CinemaOverlay mode={cinemaMode}>
            <div className="w-full h-full max-w-5xl max-h-[60vh] bg-surface rounded-2xl border border-border relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center px-4">
                  <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 3 }}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Play className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                  </motion.div>
                  <h3 className="text-base sm:text-lg font-semibold mb-1">Ready to Watch</h3>
                  <p className="text-text-secondary text-xs sm:text-sm max-w-xs sm:max-w-md mx-auto">
                    Open your anime with the SyncSaga extension installed.
                  </p>
                </div>
              </div>

              {/* Timeline reaction bar */}
              <div className="absolute top-0 left-0 right-0">
                <ReactionBar reactions={timelineReactions} duration={duration} />
              </div>

              {/* Floating reactions */}
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

              {/* Playback Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button onClick={() => {
                      const next = playbackState === 'playing' ? 'paused' : 'playing';
                      setPlaybackState(next);
                      sendSyncEvent({ type: next === 'playing' ? 'play' : 'pause', timestamp: currentTime });
                    }}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0">
                      {playbackState === 'playing' ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                    {/* Clip capture */}
                    <ClipCapture roomId={roomId} currentTime={currentTime} episode={episode || undefined} />
                    {/* Timeline reactions */}
                    <TimelineReactions
                      roomId={roomId}
                      currentTime={currentTime}
                      reactions={timelineReactions}
                      onReactionAdd={r => setTimelineReactions(prev => [...prev, r])}
                    />
                  </div>

                  <div className="flex-1 flex items-center gap-2 glass-panel p-2">
                    <span className="text-xs text-text-secondary w-10 text-right shrink-0">{formatTime(currentTime)}</span>
                    <div className="flex-1 h-1.5 bg-white/15 rounded-full overflow-hidden cursor-pointer group relative">
                      <div className="h-full bg-gradient-to-r from-primary to-accent-cyan rounded-full group-hover:h-2 transition-all" style={{ width: `${(currentTime / duration) * 100}%` }} />
                    </div>
                    <span className="text-xs text-text-secondary w-10 shrink-0">{formatTime(duration)}</span>
                  </div>

                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-text-secondary shrink-0" />
                </div>
              </div>
            </div>
          </CinemaOverlay>
        </div>

        {/* Bottom Controls Bar */}
        <div className="h-14 sm:h-16 border-t border-border glass flex items-center justify-between px-3 sm:px-4 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            {isInVoice && roomMembers.slice(0, 4).map(m => (
              <div key={m.user_id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-light text-xs">
                <div className={cn("w-2 h-2 rounded-full", m.user_id === user?.id ? 'bg-accent-green' : 'bg-text-muted')} />
                <span className="truncate max-w-[60px]">{m.user_id === user?.id ? 'You' : m.user_id.slice(0, 4)}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {liveKitToken && liveKitUrl && (
              <LiveKitRoom
                serverUrl={liveKitUrl}
                token={liveKitToken}
                connect={isInVoice}
                audio={!isMuted}
                video={false}
                onDisconnected={() => {
                  console.warn("LiveKit Voice Disconnected");
                  setIsInVoice(false);
                  setLiveKitToken("");
                }}
              >
                <RoomAudioRenderer />
                {/* Visual indicator of active speakers could go here */}
              </LiveKitRoom>
            )}
            <VirtualCinema
              isActive={true}
              mode={cinemaMode}
              onModeChange={setCinemaMode}
              participantCount={totalMembers}
            />
            <button aria-label={isMuted ? "Unmute" : "Mute"} aria-pressed={isMuted} onClick={() => setIsMuted(!isMuted)}
              className={cn("p-2.5 sm:p-3 rounded-xl transition-colors", isMuted ? 'bg-red-500/20 text-red-500' : 'bg-surface-light hover:bg-surface text-text-secondary')}>
              {isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <button onClick={toggleVoice}
              className={cn("px-3 sm:px-4 py-2 rounded-xl font-semibold text-sm transition-colors", isInVoice ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-accent-green/20 text-accent-green hover:bg-accent-green/30')}>
              <span className="flex items-center gap-1.5 sm:gap-2">
                {isInVoice ? <><PhoneOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Leave</> : <><Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Join Voice</>}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-l border-border bg-surface flex flex-col overflow-hidden hidden sm:flex"
          >
            <LayoutGroup>
              <div className="flex border-b border-border shrink-0">
                {(['chat', 'users', 'anime'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={cn("flex-1 py-3 text-sm font-medium transition-colors relative", activeTab === tab ? 'text-primary' : 'text-text-secondary hover:text-text-primary')}>
                    <span className="flex items-center justify-center gap-1.5">
                      {tab === 'chat' ? <MessageSquare className="w-4 h-4" /> : tab === 'users' ? <Users className="w-4 h-4" /> : <Tv className="w-4 h-4" />}
                      {tab === 'chat' ? 'Chat' : tab === 'users' ? `Users (${totalMembers})` : 'Anime'}
                    </span>
                    {activeTab === tab && <motion.div layoutId="room-sidebar-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                  </button>
                ))}
              </div>
            </LayoutGroup>

            {activeTab === 'anime' ? (
              <div className="flex-1 overflow-y-auto min-h-0">
                <AnimeInfoSidebar
                  animeTitle={episode}
                  mediaId={currentRoom?.anime_id || null}
                  currentEpisode={currentRoom?.episode_number || null}
                  onSetEpisode={(mediaId, ep) => {
                    sendSyncEvent({ type: 'episode', timestamp: 0, episode: `Episode ${ep}` });
                  }}
                />
              </div>
            ) : activeTab === 'chat' ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3">
                  {messages.length === 0 && (
                    <div className="text-center text-text-muted text-sm py-8">No messages yet. Say hello!</div>
                  )}
                  <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const msg = messages[virtualRow.index];
                      return (
                        <div
                          key={msg.id}
                          className="absolute top-0 left-0 w-full mb-2"
                          style={{
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <div className="flex items-start gap-2 pr-2">
                              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold shrink-0">
                                {msg.profile?.username?.[0]?.toUpperCase() || '?'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-primary">{msg.profile?.username || 'User'}</span>
                                  <span className="text-[10px] text-text-muted">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-sm text-text-primary break-words mt-1 p-2 bg-surface-light rounded-r-xl rounded-bl-xl shadow-sm">{msg.content}</p>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      );
                    })}
                  </div>
                  {typingUsers.length > 0 && (
                    <div className="text-xs text-text-muted italic mt-2">{typingUsers.length} user{typingUsers.length > 1 ? 's' : ''} typing...</div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-3 border-t border-border shrink-0">
                  <div className="flex items-center gap-2 bg-surface-light rounded-xl px-3 py-2">
                    <button className="text-text-muted hover:text-text-secondary transition-colors shrink-0"><Smile className="w-5 h-5" /></button>
                    <input type="text" value={input} onChange={e => { setInput(e.target.value); sendTyping(e.target.value.length > 0); }}
                      onKeyDown={handleKeyDown} placeholder="Type a message..." maxLength={2000}
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted min-w-0" />
                    <button onClick={handleSend} disabled={!input.trim()}
                      className="text-primary hover:text-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0">
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-primary/5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center text-sm font-semibold shrink-0">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user?.username || 'You'}</p>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-accent-green">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />Online
                      </span>
                      {(() => {
                        const ds = driftStatuses.get(user?.id || '');
                        if (!ds) return null;
                        const dc = ds.status === 'synced' ? 'bg-accent-green' : ds.status === 'slight' ? 'bg-yellow-500' : 'bg-red-500';
                        const tc = ds.status === 'synced' ? 'text-accent-green' : ds.status === 'slight' ? 'text-yellow-500' : 'text-red-500';
                        return <span className={`flex items-center gap-1 text-xs ${tc}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dc}`} />
                          {ds.status === 'synced' ? 'In Sync' : ds.status === 'slight' ? 'Slight Drift' : 'Desynced'}
                        </span>;
                      })()}
                    </div>
                  </div>
                  {isHost && <Crown className="w-4 h-4 text-yellow-500 ml-auto shrink-0" />}
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-2 px-1">In Room — {totalMembers}</p>
                  {roomMembers.map(m => {
                    const ds = driftStatuses.get(m.user_id);
                    const dc = !ds ? 'bg-text-muted' : ds.status === 'synced' ? 'bg-accent-green' : ds.status === 'slight' ? 'bg-yellow-500' : 'bg-red-500';
                    return (
                      <div key={m.user_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-light transition-colors">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-sm font-semibold shrink-0">
                            {m.user_id[0]?.toUpperCase()}
                          </div>
                          {ds && (
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${dc} border-2 border-surface`} title={`Drift: ${ds.drift.toFixed(2)}s`} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm truncate">{m.user_id.slice(0, 8)}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-text-muted">{m.role === 'host' ? 'Host' : m.role === 'co_host' ? 'Co-Host' : 'Member'}</p>
                            {ds && (
                              <span className={cn('text-[10px]', ds.status === 'synced' ? 'text-accent-green' : ds.status === 'slight' ? 'text-yellow-500' : 'text-red-500')}>
                                {ds.status === 'synced' ? 'Synced' : `${ds.drift.toFixed(1)}s`}
                              </span>
                            )}
                          </div>
                        </div>
                        {m.role === 'host' && <Crown className="w-3.5 h-3.5 text-yellow-500 ml-auto shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                {/* Taste Graph */}
                <div className="pt-3">
                  <TasteGraph onSelect={(title) => setEpisode(title)} />
                </div>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Activity Feed Sidebar */}
      <AnimatePresence>
        {showFeed && (
          <FriendsFeed collapsed={false} onToggle={() => setShowFeed(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
