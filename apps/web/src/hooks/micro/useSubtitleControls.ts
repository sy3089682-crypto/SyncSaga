'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  languageCode: string;
  isDefault: boolean;
}

export interface SubtitleStyle {
  fontSize: number;        // px
  fontColor: string;       // hex
  backgroundColor: string; // hex or 'transparent'
  fontFamily: string;
  textShadow: string;
  outline: string;
}

export interface UseSubtitleControlsOptions {
  defaultSize?: number;
  defaultColor?: string;
  defaultLanguage?: string;
  tracks?: SubtitleTrack[];
}

export function useSubtitleControls(options: UseSubtitleControlsOptions = {}) {
  const { 
    defaultSize = 24,
    defaultColor = '#FFFFFF',
    defaultLanguage = 'en',
    tracks = [],
  } = options;
  
  const [isEnabled, setIsEnabled] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<SubtitleTrack | null>(
    tracks.find(t => t.languageCode === defaultLanguage) || tracks[0] || null
  );
  const [style, setStyle] = useState<SubtitleStyle>({
    fontSize: defaultSize,
    fontColor: defaultColor,
    backgroundColor: 'transparent',
    fontFamily: 'Arial, sans-serif',
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
    outline: '1px solid black',
  });
  const [position, setPosition] = useState<'bottom' | 'middle' | 'top'>('bottom');
  const [isLoading, setIsLoading] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Set video element
  const setVideoElement = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;
  }, []);

  // Toggle subtitles
  const toggle = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  // Enable subtitles
  const enable = useCallback(() => {
    setIsEnabled(true);
  }, []);

  // Disable subtitles
  const disable = useCallback(() => {
    setIsEnabled(false);
  }, []);

  // Select track
  const selectTrack = useCallback((track: SubtitleTrack) => {
    setCurrentTrack(track);
    // In a real implementation, this would switch the text track
  }, []);

  // Set font size
  const setFontSize = useCallback((size: number) => {
    setStyle(prev => ({ ...prev, fontSize: Math.max(12, Math.min(72, size)) }));
  }, []);

  // Increase font size
  const increaseFontSize = useCallback(() => {
    setStyle(prev => ({ ...prev, fontSize: Math.min(72, prev.fontSize + 2) }));
  }, []);

  // Decrease font size
  const decreaseFontSize = useCallback(() => {
    setStyle(prev => ({ ...prev, fontSize: Math.max(12, prev.fontSize - 2) }));
  }, []);

  // Set font color
  const setFontColor = useCallback((color: string) => {
    setStyle(prev => ({ ...prev, fontColor: color }));
  }, []);

  // Set background color
  const setBackgroundColor = useCallback((color: string) => {
    setStyle(prev => ({ ...prev, backgroundColor: color }));
  }, []);

  // Set position
  const setSubtitlePosition = useCallback((pos: 'top' | 'middle' | 'bottom') => {
    setPosition(pos);
  }, []);

  // Reset to defaults
  const reset = useCallback(() => {
    setIsEnabled(true);
    setCurrentTrack(tracks[0] || null);
    setStyle({
      fontSize: defaultSize,
      fontColor: defaultColor,
      backgroundColor: 'transparent',
      fontFamily: 'Arial, sans-serif',
      textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
      outline: '1px solid black',
    });
    setPosition('bottom');
  }, [defaultSize, defaultColor, tracks]);

  // Preset styles
  const applyPreset = useCallback((preset: 'default' | 'large' | 'small' | 'high_contrast') => {
    switch (preset) {
      case 'large':
        setStyle(prev => ({ ...prev, fontSize: 36 }));
        break;
      case 'small':
        setStyle(prev => ({ ...prev, fontSize: 18 }));
        break;
      case 'high_contrast':
        setStyle(prev => ({
          ...prev,
          fontSize: 32,
          fontColor: '#FFFF00',
          backgroundColor: 'rgba(0,0,0,0.8)',
          textShadow: 'none',
          outline: '2px solid black',
        }));
        break;
      default:
        reset();
    }
  }, [reset]);

  // Get style as CSS string
  const getCSS = useCallback((): string => {
    if (!isEnabled || !currentTrack) return '';
    
    return `
      font-size: ${style.fontSize}px;
      color: ${style.fontColor};
      background-color: ${style.backgroundColor};
      font-family: ${style.fontFamily};
      text-shadow: ${style.textShadow};
      outline: ${style.outline};
    `;
  }, [isEnabled, currentTrack, style]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key) {
        case 'c':
        case 'C':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            toggle();
          }
          break;
        case '+':
        case '=':
          if (e.shiftKey) {
            e.preventDefault();
            increaseFontSize();
          }
          break;
        case '-':
          e.preventDefault();
          decreaseFontSize();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle, increaseFontSize, decreaseFontSize]);

  return {
    isEnabled,
    currentTrack,
    style,
    position,
    isLoading,
    tracks,
    setVideoElement,
    toggle,
    enable,
    disable,
    selectTrack,
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
    setFontColor,
    setBackgroundColor,
    setPosition,
    reset,
    applyPreset,
    getCSS,
  };
}
