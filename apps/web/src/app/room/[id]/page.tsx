'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, MessageSquare, Mic, MicOff, PhoneOff, Send, Smile, 
  Play, Pause, Settings, Crown, MoreVertical, Volume2 
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getSocket } from '@/lib/socket';
import { cn, formatTime } from '@/lib/utils';
import { Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '@syncsaga/shared';

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  avatar?: string;
}

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isHost?: boolean;
  isSpeaking?: boolean;
  isMuted?: boolean;
}

export default function RoomPage() {
  const params = useParams();
  const roomId = params.id as string;
  const { user, token } = useAppStore();
  
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isInVoice, setIsInVoice] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'users'>('chat');
  const [playbackState, setPlaybackState] = useState<'playing' | 'paused'>('paused');
  const [currentTime, setCurrentTime] = useState(0);
  const [showChat, setShowChat] = useState(true);
  
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Initialize socket connection
  useEffect(() => {
    const s = getSocket(token || undefined);
    setSocket(s);

    s.on('connect', () => {
      setIsConnected(true);
      s.emit('room:join', { roomId });
      s.emit('sync:request', { roomId });
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('room:state', (room) => {
      console.log('Room state:', room);
    });

    s.on('room:user_joined', (userData: any) => {
      setParticipants(prev => [...prev, {
        id: userData.id,
        name: userData.username || 'User',
        avatar: userData.avatar_url,
      }]);
    });

    s.on('room:user_left', (userId: string) => {
      setParticipants(prev => prev.filter(p => p.id !== userId));
    });

    s.on('chat:message', (msg: any) => {
      setMessages(prev => [...prev, {
        id: msg.id,
        sender: msg.sender?.username || 'Unknown',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        avatar: msg.sender?.avatar_url,
      }]);
    });

    s.on('sync:event', (event: any) => {
      if (event.type === 'play') setPlaybackState('playing');
      if (event.type === 'pause') setPlaybackState('paused');
      if (event.type === 'seek') setCurrentTime(event.timestamp);
    });

    s.on('sync:state', (state: any) => {
      setCurrentTime(state.timestamp);
      setPlaybackState(state.playback_state);
    });

    return () => {
      s.emit('room:leave', { roomId });
    };
  }, [roomId, token]);

  // Auto-scroll chat
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!inputMessage.trim() || !socket) return;
    
    socket.emit('chat:message', {
      roomId,
      content: inputMessage.trim(),
      type: 'text',
    });
    
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleVoice = () => {
    setIsInVoice(!isInVoice);
    if (!isInVoice) {
      socket?.emit('voice:join', { roomId });
    } else {
      socket?.emit('voice:leave', { roomId });
    }
  };

  return (
    <div className="h-screen bg-background text-text-primary flex overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Room Header */}
        <div className="h-14 border-b border-border glass flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-accent-green" : "bg-red-500"
              )} />
              <h1 className="font-semibold">Room {roomId}</h1>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface text-sm text-text-secondary">
              <Users className="w-3.5 h-3.5" />
              {participants.length + 1}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChat(!showChat)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                showChat ? "bg-primary/20 text-primary" : "hover:bg-surface-light text-text-secondary"
              )}
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-lg hover:bg-surface-light text-text-secondary transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video / Sync Area */}
        <div className="flex-1 flex items-center justify-center p-4 relative">
          <div className="w-full max-w-5xl aspect-video bg-surface rounded-2xl border border-border relative overflow-hidden">
            {/* Placeholder for video area */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Play className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Ready to Watch</h3>
                <p className="text-text-secondary text-sm max-w-md">
                  Open your anime in another tab with the SyncSaga extension installed. 
                  Playback will synchronize automatically.
                </p>
              </div>
            </div>

            {/* Playback Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    const newState = playbackState === 'playing' ? 'paused' : 'playing';
                    setPlaybackState(newState);
                    socket?.emit('sync:event', {
                      room_id: roomId,
                      user_id: user?.id || '',
                      type: newState === 'playing' ? 'play' : 'pause',
                      timestamp: currentTime,
                    });
                  }}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  {playbackState === 'playing' ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>
                
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-sm text-text-secondary w-12 text-right">
                    {formatTime(currentTime)}
                  </span>
                  <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden cursor-pointer">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ width: '15%' }}
                    />
                  </div>
                  <span className="text-sm text-text-secondary w-12">24:00</span>
                </div>

                <Volume2 className="w-5 h-5 text-text-secondary" />
              </div>
            </div>
          </div>
        </div>

        {/* Voice Bar */}
        <div className="h-16 border-t border-border glass flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            {isInVoice && (
              <div className="flex items-center gap-2 mr-4">
                {participants.slice(0, 3).map((p, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center text-xs">
                    {p.name[0]}
                  </div>
                ))}
                {participants.length > 3 && (
                  <span className="text-sm text-text-secondary">+{participants.length - 3}</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={cn(
                "p-3 rounded-xl transition-colors",
                isMuted 
                  ? "bg-red-500/20 text-red-500" 
                  : "bg-surface-light hover:bg-surface text-text-secondary"
              )}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleVoice}
              className={cn(
                "px-4 py-2 rounded-xl font-semibold transition-colors",
                isInVoice
                  ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                  : "bg-accent-green/20 text-accent-green hover:bg-accent-green/30"
              )}
            >
              {isInVoice ? (
                <span className="flex items-center gap-2">
                  <PhoneOff className="w-4 h-4" />
                  Disconnect
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Join Voice
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar (Chat & Users) */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-l border-border bg-surface flex flex-col overflow-hidden"
          >
            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab('chat')}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors relative",
                  activeTab === 'chat' ? "text-primary" : "text-text-secondary hover:text-text-primary"
                )}
              >
                <span className="flex items-center justify-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </span>
                {activeTab === 'chat' && (
                  <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors relative",
                  activeTab === 'users' ? "text-primary" : "text-text-secondary hover:text-text-primary"
                )}
              >
                <span className="flex items-center justify-center gap-2">
                  <Users className="w-4 h-4" />
                  Users
                </span>
                {activeTab === 'users' && (
                  <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'chat' ? (
                <div className="h-full flex flex-col">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={chatScrollRef}>
                    {messages.length === 0 && (
                      <div className="text-center text-text-muted text-sm py-8">
                        No messages yet. Say hello!
                      </div>
                    )}
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group"
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs shrink-0">
                            {msg.sender[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-primary">{msg.sender}</span>
                              <span className="text-xs text-text-muted">
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm text-text-primary break-words">{msg.content}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messageEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-3 border-t border-border">
                    <div className="flex items-center gap-2 bg-surface-light rounded-xl px-3 py-2">
                      <button className="text-text-muted hover:text-text-secondary transition-colors">
                        <Smile className="w-5 h-5" />
                      </button>
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim()}
                        className="text-primary hover:text-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {/* Current User */}
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-primary/5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center text-sm font-semibold">
                      {user?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user?.username || 'You'}</p>
                      <p className="text-xs text-accent-green">Online</p>
                    </div>
                    <Crown className="w-4 h-4 text-yellow-500 ml-auto" />
                  </div>

                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-text-muted uppercase tracking-wider mb-2">In Room — {participants.length + 1}</p>
                    {participants.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-light transition-colors">
                        <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-sm">
                          {p.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm">{p.name}</p>
                          <p className="text-xs text-text-muted">Watching</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
