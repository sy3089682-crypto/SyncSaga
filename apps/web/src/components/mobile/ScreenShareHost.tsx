'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useMobileHost } from '@/hooks/useMobileHost';
import { Tv, Monitor, X, AlertTriangle, Globe, Film } from 'lucide-react';

interface ScreenShareHostProps {
  roomId: string;
  onHostReady?: () => void;
}

export function ScreenShareHost({ roomId, onHostReady }: ScreenShareHostProps) {
  const {
    isScreenSharing,
    requestScreenShare,
    endScreenShare,
    screenShareStream,
    error,
    clearError,
    isHost,
    checkHostStatus,
  } = useMobileHost({ roomId });
  
  // Get the stream from ref since hook returns current value
  const screenShareStreamRef = useRef<MediaStream | null>(null);
  useEffect(() => {
    screenShareStreamRef.current = screenShareStream;
  }, [screenShareStream]);

  const [showHelp, setShowHelp] = useState(false);
  const [streamingSite, setStreamingSite] = useState<'auto' | 'netflix' | 'disney' | 'hulu' | 'other'>('auto');
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check host status on mount
  useEffect(() => {
    checkHostStatus();
  }, [checkHostStatus]);

  // Notify parent when host is ready
  useEffect(() => {
    if (isScreenSharing && onHostReady) {
      onHostReady();
    }
  }, [isScreenSharing, onHostReady]);

  // Set video source when stream changes
  useEffect(() => {
    if (videoRef.current && screenShareStreamRef.current) {
      videoRef.current.srcObject = screenShareStreamRef.current;
    }
  }, [screenShareStreamRef.current]);

  const handleStartScreenShare = useCallback(async () => {
    try {
      await requestScreenShare();
      onHostReady?.();
    } catch (err: any) {
      // Error is handled by the hook
    }
  }, [requestScreenShare, onHostReady]);

  const handleStopScreenShare = useCallback(() => {
    endScreenShare();
  }, [endScreenShare]);

  // Detect streaming site from URL (for help text)
  useEffect(() => {
    const url = window.location.href;
    if (url.includes('netflix.com')) setStreamingSite('netflix');
    else if (url.includes('disneyplus.com') || url.includes('disneyplus.com')) setStreamingSite('disney');
    else if (url.includes('hulu.com')) setStreamingSite('hulu');
    else if (url.includes('crunchyroll.com') || url.includes('youtube.com')) setStreamingSite('other');
  }, []);

  const getStreamingSiteLabel = () => {
    switch (streamingSite) {
      case 'netflix': return 'Netflix';
      case 'disney': return 'Disney+';
      case 'hulu': return 'Hulu';
      default: return 'Other';
    }
  };

  if (!isHost) {
    return (
      <div className="relative aspect-video bg-black rounded-xl flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <Tv className="w-8 h-8 text-primary" />
        </div>
        
        <h3 className="text-lg font-semibold mb-2">Host Required</h3>
        <p className="text-sm text-text-secondary mb-4 max-w-xs">
          Only the room host can share their screen. Switch to a host account or create a new room.
        </p>
      </div>
    );
  }

  if (isScreenSharing && screenShareStreamRef.current) {
    return (
      <div className="relative">
        {/* Main screen share view */}
        <div 
          ref={containerRef}
          className="relative aspect-video bg-black rounded-xl overflow-hidden"
        >
          {/* Screen share preview */}
          <video
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
            ref={videoRef}
          />
          
          {/* Recording indicator */}
          <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/90">
            <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <span className="text-white text-xs font-medium">Sharing Screen</span>
          </div>
          
          {/* Streaming site badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 text-white text-xs">
            <Globe className="w-3 h-3" />
            {getStreamingSiteLabel()}
          </div>
          
          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
            <div className="flex items-center justify-between">
              <button
                onClick={handleStopScreenShare}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/90 hover:bg-red-500 text-white text-sm font-medium transition-colors"
              >
                <X className="w-4 h-4" />
                Stop Sharing
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Help"
                >
                  <AlertTriangle className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Help overlay */}
          {showHelp && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur p-4 overflow-y-auto">
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-semibold mb-4 text-white">Screen Sharing Tips</h3>
                
                <div className="space-y-3 mb-6">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm text-white/80 mb-1">
                      <strong>1. Navigate to your streaming site</strong>
                    </p>
                    <p className="text-xs text-white/50">
                      Open Netflix, Disney+, Hulu, or any streaming site in your browser.
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm text-white/80 mb-1">
                      <strong>2. Start sharing</strong>
                    </p>
                    <p className="text-xs text-white/50">
                      Tap "Start Sharing" and select your browser window or screen.
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm text-white/80 mb-1">
                      <strong>3. Play your content</strong>
                    </p>
                    <p className="text-xs text-white/50">
                      Start the video. Your guests will see everything on your screen.
                    </p>
                  </div>
                </div>
                
                <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-400">
                      DRM content (Netflix, Disney+) may show a black screen due to content protection. 
                      Use screen share mode for best compatibility.
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowHelp(false)}
                  className="w-full py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Mobile tips bar */}
        <div className="mt-2 px-1">
          <div className="flex items-center justify-center gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <Film className="w-3 h-3" />
              Landscape recommended
            </span>
            <span className="flex items-center gap-1">
              <Monitor className="w-3 h-3" />
              Keep screen on
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Not yet sharing - show start screen
  return (
    <div className="relative">
      <div 
        ref={containerRef}
        className="relative aspect-video bg-black rounded-xl flex flex-col items-center justify-center p-6 text-center"
      >
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-5 animate-pulse">
          <Monitor className="w-10 h-10 text-primary" />
        </div>
        
        <h3 className="text-xl font-semibold mb-2">Share Your Screen</h3>
        <p className="text-text-secondary text-sm mb-6 max-w-xs">
          To host Netflix, Disney+, Hulu, or other streaming sites, share your screen.
          Your friends will see everything on your display.
        </p>
        
        {/* Streaming site selector */}
        <div className="w-full max-w-xs mb-5">
          <label className="block text-xs text-text-muted mb-2 text-left">What are you watching?</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'auto', label: 'Auto Detect', icon: Globe },
              { id: 'netflix', label: 'Netflix', icon: Tv },
              { id: 'disney', label: 'Disney+', icon: Film },
              { id: 'hulu', label: 'Hulu', icon: Film },
            ].map((site) => (
              <button
                key={site.id}
                onClick={() => setStreamingSite(site.id as any)}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                  streamingSite === site.id
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-surface border-border text-text-secondary hover:border-primary/30'
                }`}
              >
                <site.icon className="w-4 h-4" />
                {site.label}
              </button>
            ))}
          </div>
        </div>
        
        <button
          onClick={handleStartScreenShare}
          className="w-full max-w-xs px-6 py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold hover:shadow-xl hover:shadow-primary/25 transition-all flex items-center justify-center gap-2"
        >
          <Monitor className="w-5 h-5" />
          Start Sharing
        </button>
        
        {error && (
          <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Tips */}
        <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Allow screen share permission
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Keep screen awake during hosting
          </span>
        </div>
      </div>
    </div>
  );
}
