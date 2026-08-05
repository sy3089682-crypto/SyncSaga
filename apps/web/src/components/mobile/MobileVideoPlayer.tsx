'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useSyncEngine } from '@/hooks/useSyncEngine';
import { isMobile, hasTouchScreen } from '@/hooks/useMobileHost';

interface MobileVideoPlayerProps {
  src: string;
  roomId: string;
  isHost: boolean;
  autoPlay?: boolean;
  onPlaybackChange?: (isPlaying: boolean) => void;
}

export function MobileVideoPlayer({ 
  src, 
  roomId, 
  isHost, 
  autoPlay = false,
  onPlaybackChange,
}: MobileVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const touchStartTimeRef = useRef<number>(0);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [controlsTimeout, setControlsTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Sync engine for host
  useSyncEngine(roomId, {
    getCurrentTime: () => videoRef.current?.currentTime ?? 0,
    isPlaying: () => !videoRef.current?.paused,
    onSeek: (timestamp) => {
      if (videoRef.current) {
        videoRef.current.currentTime = timestamp;
      }
    },
    onPlaybackStateChange: (state) => {
      if (videoRef.current) {
        const shouldPlay = state === 'playing';
        const isCurrentlyPlaying = !videoRef.current.paused;
        
        if (shouldPlay && videoRef.current.paused) {
          videoRef.current.play().catch(console.error);
        } else if (!shouldPlay && !videoRef.current.paused) {
          videoRef.current.pause();
        }
        
        setIsPlaying(shouldPlay);
        onPlaybackChange?.(shouldPlay);
      }
    },
    onSpeedChange: (speed) => {
      if (videoRef.current) {
        videoRef.current.playbackRate = speed;
        setPlaybackRate(speed);
      }
    },
  });

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      onPlaybackChange?.(true);
    };
    const handlePause = () => {
      setIsPlaying(false);
      onPlaybackChange?.(false);
    };
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleWaiting = () => setBuffering(true);
    const handleCanPlay = () => setBuffering(false);
    const handleProgress = () => {
      // Could update buffered amount here
    };
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, [onPlaybackChange]);

  // Auto-hide controls on mobile
  useEffect(() => {
    if (!hasTouchScreen() || !isHost) return;

    const handleTouchStart = () => {
      setShowControls(true);
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
      setControlsTimeout(setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000));
    };

    const video = videoRef.current;
    if (video) {
      video.addEventListener('touchstart', handleTouchStart);
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('touchstart', handleTouchStart);
      }
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [isHost, isPlaying, hasTouchScreen]);

  // Touch handling for mobile gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    touchStartTimeRef.current = Date.now();
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!videoRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;
    const deltaTime = Date.now() - touchStartTimeRef.current;
    
    // Swipe horizontally to seek (only if swipe is mostly horizontal)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50 && deltaTime < 500) {
      e.preventDefault();
      const seekAmount = (deltaX / 300) * (duration || 100);
      videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seekAmount));
      setShowControls(true);
      return;
    }
    
    // Single tap to toggle play/pause
    if (Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20) {
      e.preventDefault();
      if (videoRef.current) {
        if (videoRef.current.paused) {
          videoRef.current.play().catch(console.error);
        } else {
          videoRef.current.pause();
        }
      }
      setShowControls(true);
    }
  }, [currentTime, duration]);

  // Format time helper
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Volume control
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div 
      className={`relative w-full aspect-video bg-black rounded-xl overflow-hidden touch-none ${isHost ? 'cursor-pointer' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        src={src}
        autoPlay={autoPlay && isHost}
        playsInline
        muted={!isHost}  // Mobile requires interaction for autoplay
        onClick={() => {
          if (videoRef.current) {
            if (videoRef.current.paused) {
              videoRef.current.play().catch(console.error);
            } else {
              videoRef.current.pause();
            }
          }
          setShowControls(true);
        }}
      />
      
      {/* Buffering indicator */}
      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            <span className="text-white/70 text-sm">Loading...</span>
          </div>
        </div>
      )}
      
      {/* Error state */}
      {videoRef.current?.error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-white font-medium mb-1">Video Error</p>
            <p className="text-white/60 text-sm mb-3">Failed to load video</p>
            <button
              onClick={() => videoRef.current?.load()}
              className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      
      {/* Controls overlay */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Play/Pause button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (videoRef.current) {
              if (videoRef.current.paused) {
                videoRef.current.play().catch(console.error);
              } else {
                videoRef.current.pause();
              }
            }
          }}
          className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-3 shadow-lg transition-transform active:scale-95"
        >
          {isPlaying ? (
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        
        {/* Seek bar */}
        <div className="relative mb-3">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              e.stopPropagation();
              if (videoRef.current) {
                videoRef.current.currentTime = parseFloat(e.target.value);
              }
            }}
            className="w-full h-2 rounded-full appearance-none bg-white/30 cursor-pointer accent-primary"
            style={{
              WebkitAppearance: 'none',
              height: '8px',
              borderRadius: '4px',
              background: `linear-gradient(to right, #7c3aed ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.3) ${(currentTime / (duration || 1)) * 100}%)`,
            }}
          />
        </div>
        
        {/* Time and volume row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-mono">{formatTime(currentTime)}</span>
            <span className="text-white/50">/</span>
            <span className="text-white/70 text-sm font-mono">{formatTime(duration)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Volume control */}
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="text-white/70 hover:text-white p-1"
              >
                {isMuted || volume === 0 ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : volume < 0.5 ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
              
              {/* Volume slider - only show on tap */}
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  e.stopPropagation();
                  const newVolume = parseFloat(e.target.value);
                  if (videoRef.current) {
                    videoRef.current.volume = newVolume;
                    setVolume(newVolume);
                    setIsMuted(newVolume === 0);
                  }
                }}
                className="w-16 h-1 rounded appearance-none bg-white/30 cursor-pointer"
                style={{
                  WebkitAppearance: 'none',
                  height: '4px',
                  borderRadius: '2px',
                }}
              />
            </div>
            
            {/* Playback speed - host only */}
            {isHost && (
              <div className="flex items-center gap-1">
                <span className="text-white/50 text-xs">Speed</span>
                <select
                  value={playbackRate}
                  onChange={(e) => {
                    e.stopPropagation();
                    const newRate = parseFloat(e.target.value);
                    if (videoRef.current) {
                      videoRef.current.playbackRate = newRate;
                      setPlaybackRate(newRate);
                    }
                  }}
                  className="bg-white/20 text-white text-xs rounded px-2 py-1 outline-none"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
              </div>
            )}
          </div>
        </div>
        
        {/* Sync status indicator for host */}
        {isHost && (
          <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 rounded-lg bg-black/50">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white text-xs">Hosting</span>
          </div>
        )}
      </div>
      
      {/* Large play button overlay when paused */}
      {!isPlaying && !buffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (videoRef.current) {
                videoRef.current.play().catch(console.error);
              }
            }}
            className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center shadow-2xl hover:bg-white/30 transition-all active:scale-95"
          >
            <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
