'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, Play, Pause, Mic, MicOff, Phone, PhoneOff,
  Send, Smile, Settings, Users, MessageSquare, ChevronLeft,
  Crown, Monitor, MousePointer2, Bell, Volume2, VolumeX,
  Wifi, WifiOff, Maximize2, Minimize2, Film, Share2,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useRoom } from '@/hooks/useRoom';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useMobileHost, isMobile } from '@/hooks/useMobileHost';
import { MobileVideoPlayer } from '@/components/mobile/MobileVideoPlayer';
import { ScreenShareHost } from '@/components/mobile/ScreenShareHost';
import { cn, formatTime } from '@/lib/utils';
import { api } from '@/lib/api';

interface MobileRoomProps {
  roomId: string;
}

export function MobileRoom({ roomId }: MobileRoomProps) {
  const router = useRouter();
  const { user } = useAppStore();
  const { currentRoom, roomMembers, join, leave, sendMessage, sendTyping } = useRoom(roomId);
  
  const [activeTab, setActiveTab] = useState<'chat' | 'users' | 'reactions' | 'settings'>('chat');
  const [messageInput, setMessageInput] = useState('');
  const [showStreamInput, setShowStreamInput] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showControlPanel, setShowControlPanel] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  
  const videoContainerRef = useRef<HTMLDivElement>(null);
  
  // Mobile host hooks
  const {
    isHost,
    isScreenSharing,
    hostingMode,
    error: hostError,
    checkHostStatus,
    requestScreenShare,
    endScreenShare,
    togglePictureInPicture,
    startExternalUrlHost,
    clearError,
  } = useMobileHost({ roomId });

  // Wake lock for hosts
  const {
    acquire: acquireWakeLock,
    release: releaseWakeLock,
    recordActivity,
    setHostStatus,
  } = useWakeLock({
    enableOnHost: true,
    enableOnMobile: true,
  });

  // Check host status on mount
  useEffect(() => {
    checkHostStatus();
    
    const handleMetadata = (event: any) => {
      if (event.detail?.isHost) {
        setHostStatus(true);
        acquireWakeLock();
      }
    };
    
    window.addEventListener('host:metadata', handleMetadata);
    return () => window.removeEventListener('host:metadata', handleMetadata);
  }, [checkHostStatus, setHostStatus, acquireWakeLock]);

  // Handle wake lock activity
  useEffect(() => {
    const handleInteraction = () => recordActivity();
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('mousedown', handleInteraction);
    return () => {
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('mousedown', handleInteraction);
    };
  }, [recordActivity]);

  // Connect to room
  useEffect(() => {
    const setupSocket = async () => {
      try {
        await join();
        setIsConnected(true);
      } catch (err) {
        console.error('Failed to join room:', err);
      }
    };
    setupSocket();
    
    return () => {
      leave();
      releaseWakeLock();
    };
  }, [roomId, join, leave, releaseWakeLock]);

  // Host: acquire wake lock when connected
  useEffect(() => {
    if (isHost && isConnected && isMobile()) {
      acquireWakeLock();
    }
  }, [isHost, isConnected, acquireWakeLock, isMobile]);

  // Send message
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim()) return;
    
    await sendMessage(messageInput.trim());
    setMessageInput('');
  }, [messageInput, sendMessage]);

  // Send reaction
  const handleSendReaction = useCallback(async (type: string) => {
    setSelectedReaction(type);
    setTimeout(() => setSelectedReaction(null), 1000);
    // Send reaction via socket
  }, []);

  // Start streaming with URL
  const handleStartStreaming = useCallback(async () => {
    if (!streamUrl.trim()) return;
    
    try {
      await startExternalUrlHost(streamUrl.trim());
      setShowStreamInput(false);
      setStreamUrl('');
    } catch (err) {
      console.error('Failed to start streaming:', err);
    }
  }, [streamUrl, startExternalUrlHost]);

  // Quick reactions
  const quickReactions = [
    { type: 'laugh', emoji: '😂' },
    { type: 'fire', emoji: '🔥' },
    { type: 'shock', emoji: '😱' },
    { type: 'cry', emoji: '😭' },
    { type: 'heart', emoji: '❤️' },
    { type: 'gg', emoji: '👍' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border/50 safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-surface transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div>
              <h1 className="font-semibold text-sm truncate max-w-[150px]">
                {currentRoom?.name || 'Watch Room'}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-text-muted">
                  {roomMembers.length} watching
                </span>
                {isHost && (
                  <Crown className="w-3 h-3 text-yellow-500" />
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Connection status */}
            <div className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs',
              isConnected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            )}>
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className="hidden sm:inline">{isConnected ? 'Live' : 'Offline'}</span>
            </div>
            
            {/* Notifications */}
            {notificationCount > 0 && (
              <button className="relative p-2 rounded-lg hover:bg-surface transition-colors">
                <Bell className="w-5 h-5 text-text-secondary" />
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-medium">
                  {notificationCount}
                </span>
              </button>
            )}
            
            {/* Settings */}
            <button
              onClick={() => setActiveTab('settings')}
              className="p-2 rounded-lg hover:bg-surface transition-colors"
            >
              <Settings className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pt-14 pb-16 safe-bottom">
        {/* Video area */}
        <div className="px-3 pt-3">
          {hostingMode === 'screen-share' ? (
            <ScreenShareHost roomId={roomId} />
          ) : (
            <MobileVideoPlayer
              src={currentRoom?.videoUrl || ''}
              roomId={roomId}
              isHost={isHost}
              onPlaybackChange={(playing) => {
                // Could update UI state
              }}
            />
          )}
          
          {/* Host error */}
          <AnimatePresence>
            {hostError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"
              >
                <Monitor className="w-4 h-4 shrink-0" />
                <span className="flex-1">{hostError}</span>
                <button onClick={clearError} className="text-red-400 hover:text-red-300">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Host controls */}
          {isHost && hostingMode !== 'screen-share' && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => setShowStreamInput(!showStreamInput)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                  showStreamInput
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'bg-surface border border-border text-text-secondary hover:border-primary/30'
                )}
              >
                <Monitor className="w-4 h-4" />
                {showStreamInput ? 'Cancel' : 'Share Stream URL'}
              </button>
              
              <button
                onClick={() => setShowControlPanel(!showControlPanel)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                  showControlPanel
                    ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30'
                    : 'bg-surface border border-border text-text-secondary hover:border-primary/30'
                )}
              >
                <Settings className="w-4 h-4" />
                Controls
              </button>
            </div>
          )}
          
          {/* Stream URL input */}
          <AnimatePresence>
            {showStreamInput && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 overflow-hidden"
              >
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Paste YouTube, Crunchyroll, or video URL..."
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                    onSubmit={handleStartStreaming}
                    className="flex-1 px-4 py-3 rounded-xl bg-surface border border-border text-sm focus:border-primary/50 outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleStartStreaming}
                    className="px-4 py-3 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
                  >
                    Go
                  </button>
                </div>
                <p className="mt-2 text-xs text-text-muted text-center">
                  Supports YouTube, Crunchyroll, Vimeo, and direct video files
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Host control panel */}
          <AnimatePresence>
            {showControlPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 overflow-hidden"
              >
                <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
                  {/* Playback speed */}
                  <div>
                    <label className="block text-xs text-text-muted mb-2">Playback Speed</label>
                    <div className="flex gap-1">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                        <button
                          key={speed}
                          onClick={() => {
                            // Send speed change via socket
                          }}
                          className={cn(
                            'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors',
                            speed === 1
                              ? 'bg-primary text-white'
                              : 'bg-background text-text-secondary hover:bg-surface'
                          )}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Sync settings */}
                  <div>
                    <label className="block text-xs text-text-muted mb-2">Sync Behavior</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="w-4 h-4 rounded border-border text-primary"
                        />
                        <span className="text-sm">Lock playback for guests</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-border text-primary"
                        />
                        <span className="text-sm">Auto-skip intro (when detected)</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* QR code for easy joining */}
                  <div>
                    <label className="block text-xs text-text-muted mb-2">Share Room</label>
                    <button
                      onClick={() => {
                        // Generate and show QR code
                      }}
                      className="w-full py-2 rounded-lg bg-background border border-border text-sm text-text-secondary hover:bg-surface transition-colors flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      Share Room Link / QR Code
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tab navigation */}
        <nav className="mt-3 flex justify-around safe-bottom">
          {[
            { id: 'chat', icon: MessageSquare, label: 'Chat' },
            { id: 'users', icon: Users, label: 'People' },
            { id: 'reactions', icon: Smile, label: 'React' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={cn(
                'flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors min-w-[72px]',
                activeTab === id
                  ? 'text-primary bg-primary/10'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{label}</span>
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div className="px-3 flex-1 overflow-hidden">
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[300px] max-h-[50vh] bg-surface rounded-xl border border-border overflow-hidden">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {/* Messages would be rendered here */}
                <div className="text-center text-text-muted text-sm py-8">
                  No messages yet. Start the conversation!
                </div>
              </div>
              
              {/* Input */}
              <div className="p-3 border-t border-border">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Send a message..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary/50"
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}
          
          {activeTab === 'users' && (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="p-3 border-b border-border">
                <h3 className="font-medium">People in Room</h3>
              </div>
              <div className="divide-y divide-border">
                {roomMembers.map((member: any) => (
                  <div key={member.id} className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                      {member.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.username}</p>
                      <p className="text-xs text-text-muted">
                        {member.isHost ? 'Host' : 'Viewer'}
                      </p>
                    </div>
                    {member.isHost && <Crown className="w-4 h-4 text-yellow-500" />}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'reactions' && (
            <div className="bg-surface rounded-xl border border-border p-3">
              <h3 className="font-medium mb-3 text-center">Quick Reactions</h3>
              <div className="grid grid-cols-3 gap-2">
                {quickReactions.map(({ type, emoji }) => (
                  <button
                    key={type}
                    onClick={() => handleSendReaction(type)}
                    className={cn(
                      'aspect-square rounded-xl flex items-center justify-center text-2xl transition-all',
                      selectedReaction === type
                        ? 'bg-primary/20 scale-110'
                        : 'bg-background hover:bg-primary/10'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <p className="text-center text-xs text-text-muted mt-3">
                Reactions appear at the current timestamp
              </p>
            </div>
          )}
          
          {activeTab === 'settings' && (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="p-3 border-b border-border">
                <h3 className="font-medium">Settings</h3>
              </div>
              <div className="divide-y divide-border">
                <button className="w-full p-3 text-left flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <MicOff className="w-5 h-5 text-text-secondary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Voice Chat</p>
                    <p className="text-xs text-text-muted">Disable microphone</p>
                  </div>
                  <div className="w-10 h-6 rounded-full bg-primary relative">
                    <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" />
                  </div>
                </button>
                
                <button className="w-full p-3 text-left flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <VolumeX className="w-5 h-5 text-text-secondary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Sound</p>
                    <p className="text-xs text-text-muted">Mute room audio</p>
                  </div>
                  <button className="w-10 h-6 rounded-full bg-surface border border-border">
                    <div className="w-4 h-4 rounded-full bg-text-muted absolute top-1" />
                  </button>
                </button>
                
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full p-3 text-left flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <PhoneOff className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-red-400">Leave Room</p>
                    <p className="text-xs text-text-muted">End your session</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile bottom safe area spacer */}
      <div className="h-safe-bottom" />
    </div>
  );
}

// Safe area helper component
function SafeArea({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'pb-[env(safe-area-inset-bottom)]',
      className
    )}>
      {children}
    </div>
  );
}
