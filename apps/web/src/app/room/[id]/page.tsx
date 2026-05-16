'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  Users, MessageSquare, Mic, MicOff, PhoneOff, Send, Smile,
  Play, Pause, Settings, Crown, Volume2, Monitor, Wifi, WifiOff,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useRoom } from '@/hooks/useRoom';
import { getSocket } from '@/lib/socket';
import { cn, formatTime } from '@/lib/utils';
import { ServerToClientEvents, ClientToServerEvents, RoomMember } from '@syncsaga/shared';
import { Socket } from 'socket.io-client';

export default function RoomPage() {
  const params = useParams();
  const roomId = params.id as string;
  const { user } = useAppStore();

  const { currentRoom, messages, roomMembers, join, leave, sendMessage, sendTyping, sendSyncEvent } = useRoom(roomId);

  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'users'>('chat');
  const [playbackState, setPlaybackState] = useState<'playing' | 'paused'>('paused');
  const [currentTime, setCurrentTime] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isInVoice, setIsInVoice] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Join room on mount
  useEffect(() => {
    join();
    const socket = getSocket();

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('sync:event', (event: any) => {
      if (event.type === 'play') setPlaybackState('playing');
      if (event.type === 'pause') setPlaybackState('paused');
      if (event.type === 'seek') setCurrentTime(event.timestamp);
    });
    socket.on('sync:state', (state: any) => {
      setCurrentTime(state.timestamp);
      setPlaybackState(state.playback_state);
    });
    socket.on('chat:typing', (data: { userId: string; isTyping: boolean }) => {
      if (data.isTyping) {
        setTypingUsers(prev => prev.includes(data.userId) ? prev : [...prev, data.userId]);
        setTimeout(() => setTypingUsers(prev => prev.filter(id => id !== data.userId)), 3000);
      } else {
        setTypingUsers(prev => prev.filter(id => id !== data.userId));
      }
    });

    return () => { leave(); };
  }, [roomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
  }, [input, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const toggleVoice = () => {
    setIsInVoice(!isInVoice);
    const socket = getSocket();
    socket.emit(isInVoice ? 'voice:leave' : 'voice:join', { roomId });
  };

  const isHost = currentRoom?.host_id === user?.id;

  return (
    <div className="h-screen bg-background text-text-primary flex overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-12 sm:h-14 border-b border-border glass flex items-center justify-between px-3 sm:px-4 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={cn("w-2 h-2 rounded-full shrink-0", isConnected ? 'bg-accent-green' : 'bg-red-500')} />
            <h1 className="font-semibold truncate text-sm sm:text-base">{currentRoom?.name || `Room ${roomId.slice(0, 8)}`}</h1>
            <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface text-xs text-text-secondary">
              <Users className="w-3 h-3" />
              {roomMembers.length + 1}
            </span>
            {isHost && <Crown className="w-4 h-4 text-yellow-500 shrink-0" />}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {!isConnected && (
              <span className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 text-red-500 text-xs">
                <WifiOff className="w-3 h-3" />
                Reconnecting
              </span>
            )}
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
          <div className="w-full h-full max-w-5xl max-h-[60vh] bg-surface rounded-2xl border border-border relative flex items-center justify-center">
            {/* Background animation when idle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-4">
                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 3 }}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                </motion.div>
                <h3 className="text-base sm:text-lg font-semibold mb-1">Ready to Watch</h3>
                <p className="text-text-secondary text-xs sm:text-sm max-w-xs sm:max-w-md mx-auto">
                  Open your anime with the SyncSaga extension installed. Playback syncs automatically.
                </p>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
              <div className="flex items-center gap-2 sm:gap-4">
                <button onClick={() => {
                  const next = playbackState === 'playing' ? 'paused' : 'playing';
                  setPlaybackState(next);
                  sendSyncEvent({ type: next === 'playing' ? 'play' : 'pause', timestamp: currentTime });
                }}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0">
                  {playbackState === 'playing' ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-xs text-text-secondary w-10 text-right shrink-0">{formatTime(currentTime)}</span>
                  <div className="flex-1 h-1.5 bg-white/15 rounded-full overflow-hidden cursor-pointer group">
                    <div className="h-full bg-gradient-to-r from-primary to-accent-cyan rounded-full group-hover:h-2 transition-all" style={{ width: '0%' }} />
                  </div>
                  <span className="text-xs text-text-secondary w-10 shrink-0">24:00</span>
                </div>
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-text-secondary shrink-0" />
              </div>
            </div>
          </div>
        </div>

        {/* Voice Bar */}
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
            <button onClick={() => setIsMuted(!isMuted)}
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

      {/* Sidebar */}
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
                {(['chat', 'users'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={cn("flex-1 py-3 text-sm font-medium transition-colors relative", activeTab === tab ? 'text-primary' : 'text-text-secondary hover:text-text-primary')}>
                    <span className="flex items-center justify-center gap-1.5">
                      {tab === 'chat' ? <MessageSquare className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                      {tab === 'chat' ? 'Chat' : `Users (${roomMembers.length + 1})`}
                    </span>
                    {activeTab === tab && <motion.div layoutId="sidebar-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                  </button>
                ))}
              </div>
            </LayoutGroup>

            {activeTab === 'chat' ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {messages.length === 0 && (
                    <div className="text-center text-text-muted text-sm py-8">
                      No messages yet. Say hello!
                    </div>
                  )}
                  {messages.map(msg => (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="group">
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold shrink-0">
                          {msg.sender?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-primary">{msg.sender?.username || 'User'}</span>
                            <span className="text-[10px] text-text-muted">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-sm text-text-primary break-words">{msg.content}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {typingUsers.length > 0 && (
                    <div className="text-xs text-text-muted italic">
                      {typingUsers.length} user{typingUsers.length > 1 ? 's' : ''} typing...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-3 border-t border-border shrink-0">
                  <div className="flex items-center gap-2 bg-surface-light rounded-xl px-3 py-2">
                    <button className="text-text-muted hover:text-text-secondary transition-colors shrink-0">
                      <Smile className="w-5 h-5" />
                    </button>
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
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-primary/5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center text-sm font-semibold shrink-0">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user?.username || 'You'}</p>
                    <p className="text-xs text-accent-green flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                      Online{isConnected ? '' : ' (reconnecting)'}
                    </p>
                  </div>
                  {isHost && <Crown className="w-4 h-4 text-yellow-500 ml-auto shrink-0" />}
                </div>

                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-2 px-1">In Room — {roomMembers.length + 1}</p>
                  {roomMembers.map(m => (
                    <div key={m.user_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-light transition-colors">
                      <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center text-sm font-semibold shrink-0">
                        {m.user_id[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm truncate">{m.user_id.slice(0, 8)}</p>
                        <p className="text-xs text-text-muted">{m.role === 'host' ? 'Host' : m.role === 'co_host' ? 'Co-Host' : 'Member'}</p>
                      </div>
                      {m.role === 'host' && <Crown className="w-3.5 h-3.5 text-yellow-500 ml-auto shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
