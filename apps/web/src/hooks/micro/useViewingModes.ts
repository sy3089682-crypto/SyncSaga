'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export type ViewingMode = 'default' | 'theater' | 'social' | 'pip' | 'focus';

export interface UseViewingModesOptions {
  defaultMode?: ViewingMode;
  onModeChange?: (mode: ViewingMode) => void;
}

export function useViewingModes(options: UseViewingModesOptions = {}) {
  const { defaultMode = 'default', onModeChange } = options;
  
  const [currentMode, setCurrentMode] = useState<ViewingMode>(defaultMode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);
  
  const containerRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Set video element for PiP
  const setVideoElement = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;
  }, []);

  // Set container for fullscreen
  const setContainer = useCallback((container: HTMLElement | null) => {
    containerRef.current = container;
  }, []);

  // Change viewing mode
  const setMode = useCallback((mode: ViewingMode) => {
    setCurrentMode(mode);
    onModeChange?.(mode);
    
    // Handle mode-specific actions
    switch (mode) {
      case 'theater':
        // Maximize video, minimize UI
        break;
      case 'social':
        // Show grid of participants
        break;
      case 'focus':
        // Hide all UI except video
        break;
    }
  }, [onModeChange]);

  // Toggle theater mode
  const toggleTheater = useCallback(() => {
    setCurrentMode(prev => prev === 'theater' ? defaultMode : 'theater');
  }, [defaultMode]);

  // Toggle social mode
  const toggleSocial = useCallback(() => {
    setCurrentMode(prev => prev === 'social' ? defaultMode : 'social');
  }, [defaultMode]);

  // Toggle focus mode
  const toggleFocus = useCallback(() => {
    setCurrentMode(prev => prev === 'focus' ? defaultMode : 'focus');
  }, [defaultMode]);

  // Request fullscreen
  const requestFullscreen = useCallback(async () => {
    const element = containerRef.current || videoRef.current;
    if (!element) return false;
    
    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
        setIsFullscreen(true);
        return true;
      }
    } catch (err) {
      console.error('Fullscreen request failed:', err);
      return false;
    }
    return false;
  }, []);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      return false;
    }
    
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
        return true;
      }
    } catch (err) {
      console.error('Exit fullscreen failed:', err);
      return false;
    }
    return false;
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      return exitFullscreen();
    } else {
      return requestFullscreen();
    }
  }, [isFullscreen, requestFullscreen, exitFullscreen]);

  // Request Picture-in-Picture
  const requestPiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return false;
    
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else {
        await video.requestPictureInPicture();
        setIsPiPActive(true);
      }
      return true;
    } catch (err) {
      console.error('PiP request failed:', err);
      return false;
    }
  }, []);

  // Toggle PiP
  const togglePiP = useCallback(async () => {
    if (isPiPActive) {
      await document.exitPictureInPicture();
      setIsPiPActive(false);
      return true;
    } else {
      return requestPiP();
    }
  }, [isPiPActive, requestPiP]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle PiP changes
  useEffect(() => {
    const handlePiPEnter = () => setIsPiPActive(true);
    const handlePiPExit = () => setIsPiPActive(false);
    
    document.addEventListener('enterpictureinpicture', handlePiPEnter);
    document.addEventListener('leavepictureinpicture', handlePiPExit);
    
    return () => {
      document.removeEventListener('enterpictureinpicture', handlePiPEnter);
      document.removeEventListener('leavepictureinpicture', handlePiPExit);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key) {
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 't':
        case 'T':
          e.preventDefault();
          toggleTheater();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          toggleSocial();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleFocus();
          break;
        case 'p':
        case 'P':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            togglePiP();
          }
          break;
        case 'Escape':
          if (isFullscreen) {
            exitFullscreen();
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen, toggleTheater, toggleSocial, toggleFocus, togglePiP, isFullscreen, exitFullscreen]);

  return {
    currentMode,
    isFullscreen,
    isPiPActive,
    setContainer,
    setVideoElement,
    setMode,
    toggleTheater,
    toggleSocial,
    toggleFocus,
    requestFullscreen,
    exitFullscreen,
    toggleFullscreen,
    requestPiP,
    togglePiP,
  };
}
