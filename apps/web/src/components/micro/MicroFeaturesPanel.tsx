'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Volume2, VolumeX, Maximize2, Minimize2, Tv,
  MessageSquare, Smile, Cog, Bell, Eye, EyeOff, ZoomIn, ZoomOut,
  Palette, Clock, SkipForward, SkipBack,
  Play, Pause, Lock, Unlock, Shield, Flag, X, Check,
  ChevronDown, ChevronUp, Sliders, Info,
} from 'lucide-react';
import { useQualityControls, QUALITY_OPTIONS, VideoQuality } from '@/hooks/micro/useQualityControls';
import { useViewingModes, ViewingMode } from '@/hooks/micro/useViewingModes';
import { useVolumeControls } from '@/hooks/micro/useVolumeControls';
import { useSubtitleControls } from '@/hooks/micro/useSubtitleControls';
import { useKeyboardShortcuts, DEFAULT_PLAYBACK_SHORTCUTS, Shortcut } from '@/hooks/micro/useKeyboardShortcuts';
import { useConnectionStatus, ConnectionQuality } from '@/hooks/micro/useConnectionStatus';
import { useBufferIndicator } from '@/hooks/micro/useBufferIndicator';

interface MicroFeaturesPanelProps {
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  isHost?: boolean;
  onQualityChange?: (quality: string) => void;
}

export function MicroFeaturesPanel({ videoRef, isHost = false, onQualityChange }: MicroFeaturesPanelProps) {
  const [activeTab, setActiveTab] = useState<'playback' | 'display' | 'audio' | 'shortcuts' | 'connection'>('playback');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQuickSettings, setShowQuickSettings] = useState(false);

  // Quality controls
  const {
    currentQuality,
    isDataSaverEnabled,
    applyQuality,
    toggleDataSaver,
  } = useQualityControls({ onQualityChange });

  // Viewing modes
  const {
    currentMode,
    isFullscreen,
    isPiPActive,
    toggleFullscreen,
    togglePiP,
    toggleTheater,
    toggleSocial,
    toggleFocus,
  } = useViewingModes();

  // Volume controls
  const {
    volume,
    toggleMute,
    toggleVoiceMute,
    increaseVolume,
    decreaseVolume,
    setVolumePreset,
  } = useVolumeControls();

  // Subtitle controls
  const {
    isEnabled: subtitlesEnabled,
    toggle: toggleSubtitles,
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
    applyPreset,
  } = useSubtitleControls();

  // Keyboard shortcuts
  const {
    shortcuts,
    isEnabled: shortcutsEnabled,
    toggleAll,
  } = useKeyboardShortcuts();

  // Connection status
  const {
    quality,
    latency,
    getQualityColor,
    getQualityLabel: getConnectionQualityLabel,
  } = useConnectionStatus();

  // Buffer indicator
  const {
    isBuffering,
    buffered,
    getHealthColor,
    getHealthLabel,
  } = useBufferIndicator();

  // Playback shortcuts with actions
  const playbackShortcuts: Shortcut[] = DEFAULT_PLAYBACK_SHORTCUTS.map(shortcut => ({
    ...shortcut,
    action: () => {
      if (!videoRef?.current) return;
      
      switch (shortcut.key) {
        case ' ':
        case 'k':
          // Toggle play/pause - would need video ref
          break;
        case 'ArrowLeft':
          // Rewind 10s
          videoRef.current.currentTime = Math.max(0, (videoRef.current.currentTime || 0) - 10);
          break;
        case 'ArrowRight':
          // Forward 10s
          videoRef.current.currentTime = (videoRef.current.currentTime || 0) + 10;
          break;
        case 'ArrowUp':
          increaseVolume();
          break;
        case 'ArrowDown':
          decreaseVolume();
          break;
        case 'm':
          toggleMute();
          break;
        case '0':
          videoRef.current.currentTime = 0;
          break;
        default:
          if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(shortcut.key)) {
            const percent = parseInt(shortcut.key) / 10;
            videoRef.current.currentTime = percent * (videoRef.current.duration || 0);
          }
      }
    },
  }));

  // Register shortcuts
  useEffect(() => {
    playbackShortcuts.forEach(shortcut => {
      // This would register with the useKeyboardShortcuts hook
      // For now, we just store them
    });
  }, [playbackShortcuts]);

  const tabs = [
    { id: 'playback', label: 'Playback', icon: Play },
    { id: 'display', label: 'Display', icon: Eye },
    { id: 'audio', label: 'Audio', icon: Volume2 },
    { id: 'shortcuts', label: 'Shortcuts', icon: KeyboardShortcutsIcon },
    { id: 'connection', label: 'Connection', icon: WifiIcon },
  ] as const;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Quick settings toggle */}
      <button
        onClick={() => setShowQuickSettings(!showQuickSettings)}
        className="w-12 h-12 rounded-full bg-surface border border-border shadow-lg flex items-center justify-center hover:bg-surface-light transition-colors"
        title="Quick Settings"
      >
        <Sliders className="w-5 h-5" />
      </button>

      {/* Quick settings panel */}
      <AnimatePresence>
        {showQuickSettings && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-16 right-0 w-80 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div className="flex gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary text-white'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowQuickSettings(false)}
                className="p-1 hover:bg-surface-light rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab content */}
            <div className="p-3 max-h-80 overflow-y-auto">
              {activeTab === 'playback' && (
                <div className="space-y-3">
                  {/* Quality selector */}
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Video Quality</label>
                    <select
                      value={currentQuality}
                      onChange={(e) => applyQuality(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
                    >
                      {QUALITY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Data saver */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDataSaverEnabled}
                      onChange={toggleDataSaver}
                      className="w-4 h-4 rounded border-border text-primary"
                    />
                    <span className="text-sm">Data Saver Mode</span>
                  </label>

                  {/* Playback speed */}
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Playback Speed</label>
                    <div className="flex gap-1">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                        <button
                          key={speed}
                          onClick={() => {/* Set speed */}}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            speed === 1
                              ? 'bg-primary text-white'
                              : 'bg-background border border-border text-text-secondary hover:border-primary/50'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Skip intro toggle (host only) */}
                  {isHost && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-4 h-4 rounded border-border text-primary"
                      />
                      <span className="text-sm">Auto-skip Intro</span>
                    </label>
                  )}
                </div>
              )}

              {activeTab === 'display' && (
                <div className="space-y-3">
                  {/* Viewing mode */}
                  <div>
                    <label className="block text-xs text-text-muted mb-1">View Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'default', label: 'Default', icon: Tv },
                        { id: 'theater', label: 'Theater', icon: Maximize2 },
                        { id: 'social', label: 'Social', icon: MessageSquare },
                        { id: 'focus', label: 'Focus', icon: Eye },
                      ].map(mode => (
                        <button
                          key={mode.id}
                          onClick={() => {
                            switch (mode.id) {
                              case 'theater': toggleTheater(); break;
                              case 'social': toggleSocial(); break;
                              case 'focus': toggleFocus(); break;
                            }
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                            currentMode === mode.id
                              ? 'bg-primary/10 border-primary/30 text-primary'
                              : 'bg-background border-border text-text-secondary hover:border-primary/30'
                          }`}
                        >
                          <mode.icon className="w-4 h-4" />
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-background border border-border text-sm hover:border-primary/30 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded bg-surface-light text-xs">F</kbd>
                  </button>

                  {/* PiP */}
                  <button
                    onClick={togglePiP}
                    disabled={!('pictureInPictureEnabled' in document)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-background border border-border text-sm hover:border-primary/30 transition-colors disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      {isPiPActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      Picture-in-Picture
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded bg-surface-light text-xs">P</kbd>
                  </button>

                  {/* Subtitles */}
                  <div className="pt-2 border-t border-border">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm">Subtitles</span>
                      <button
                        onClick={toggleSubtitles}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          subtitlesEnabled ? 'bg-primary' : 'bg-surface-light'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            subtitlesEnabled ? 'translate-x-5' : ''
                          }`}
                        />
                      </button>
                    </label>
                    
                    {subtitlesEnabled && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-text-muted">Size</span>
                          <div className="flex gap-1">
                            <button onClick={decreaseFontSize} className="px-2 py-1 rounded bg-surface-light text-xs">A-</button>
                            <button onClick={increaseFontSize} className="px-2 py-1 rounded bg-surface-light text-xs">A+</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'audio' && (
                <div className="space-y-3">
                  {/* Master volume */}
                  <div>
                    <label className="flex items-center justify-between text-sm mb-1">
                      <span>Master Volume</span>
                      <button
                        onClick={toggleMute}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                          volume.isMuted ? 'bg-red-500 text-white' : 'bg-surface-light text-text-muted'
                        }`}
                      >
                        {volume.isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      </button>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume.master}
                      onChange={(e) => {/* Set volume */}}
                      className="w-full h-1.5 rounded-full appearance-none bg-surface-light cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-text-muted mt-1">
                      <span>🔇</span>
                      <span>🔊</span>
                    </div>
                  </div>

                  {/* Quick presets */}
                  <div className="grid grid-cols-5 gap-1">
                    {['mute', 'low', 'medium', 'high', 'max'].map(preset => (
                      <button
                        key={preset}
                        onClick={() => setVolumePreset(preset as any)}
                        className="py-1.5 rounded-lg bg-surface-light text-xs hover:bg-primary/10 transition-colors"
                      >
                        {preset === 'mute' ? '🔇' : preset === 'low' ? '🔈' : preset === 'medium' ? '🔉' : preset === 'high' ? '🔊' : '📢'}
                      </button>
                    ))}
                  </div>

                  {/* Voice chat volume */}
                  <div className="pt-2 border-t border-border">
                    <label className="flex items-center justify-between text-sm mb-1">
                      <span>Voice Chat</span>
                      <button
                        onClick={toggleVoiceMute}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                          volume.isVoiceMuted ? 'bg-red-500 text-white' : 'bg-surface-light text-text-muted'
                        }`}
                      >
                        {volume.isVoiceMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      </button>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume.voiceChat}
                      onChange={(e) => {/* Set voice volume */}}
                      className="w-full h-1.5 rounded-full appearance-none bg-surface-light cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'shortcuts' && (
                <div className="space-y-2">
                  <div className="text-xs text-text-muted mb-2">Keyboard Shortcuts</div>
                  {playbackShortcuts.slice(0, 8).map(shortcut => (
                    <div key={shortcut.key} className="flex items-center justify-between py-1.5">
                      <span className="text-sm">{shortcut.description}</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-surface-light text-xs font-mono">
                        {shortcut.key.toUpperCase()}
                      </kbd>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'connection' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getQualityColor(quality) }}
                      />
                      <span className="text-sm">{getConnectionQualityLabel(quality)}</span>
                    </div>
                    <span className="text-sm font-mono">{latency}ms</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm">Buffer</span>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-20 h-1.5 rounded-full bg-surface-light overflow-hidden"
                      >
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${buffered * 100}%`,
                            backgroundColor: getHealthColor(),
                          }}
                        />
                      </div>
                      <span className="text-xs text-text-muted">{Math.round(buffered * 100)}%</span>
                    </div>
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

// Simple icon components to avoid import issues
function KeyboardShortcutsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
    </svg>
  );
}

function WifiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="1" />
    </svg>
  );
}
