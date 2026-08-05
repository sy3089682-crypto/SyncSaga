'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useAppStore } from '@/store/useAppStore';

interface MobileHostOptions {
  roomId: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

export function useMobileHost(options: MobileHostOptions) {
  const { roomId, videoRef } = options;
  const { user } = useAppStore();
  
  const [isHost, setIsHost] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isInPIP, setIsInPIP] = useState(false);
  const [hostingMode, setHostingMode] = useState<'embedded' | 'screen-share' | 'external-url'>('embedded');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const screenShareRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<any>(null);
  const screenShareStreamRef = useRef<MediaStream | null>(null);

  // Check if current user is host
  const checkHostStatus = useCallback(async () => {
    try {
      const socket = await getSocket();
      socketRef.current = socket;
      
      socket.emit('room:status', { roomId }, (response: any) => {
        const host = response.isHost || response.user_role === 'host' || response.host_id === user?.id;
        setIsHost(host);
      });
    } catch (err) {
      console.error('Failed to check host status:', err);
    }
  }, [roomId, user?.id]);

  // Request screen share
  const requestScreenShare = useCallback(async () => {
    try {
      // Check if supported
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Screen sharing not supported on this browser');
      }
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        } as MediaTrackConstraints,
        audio: true,
      });
      
      screenShareRef.current = stream;
      screenShareStreamRef.current = stream;
      setIsScreenSharing(true);
      setHostingMode('screen-share');
      setError(null);
      
      // Handle user stopping share via browser UI
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => {
          endScreenShare();
        });
      }
      
      return stream;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start screen share';
      console.error('Screen share failed:', err);
      setError(errorMessage);
      throw err;
    }
  }, []);

  // End screen share
  const endScreenShare = useCallback(() => {
    if (screenShareRef.current) {
      screenShareRef.current.getTracks().forEach(track => track.stop());
      screenShareRef.current = null;
    }
    screenShareStreamRef.current = null;
    setIsScreenSharing(false);
    setHostingMode('embedded');
    setVideoUrl(null);
  }, []);

  // Picture-in-Picture toggle
  const togglePictureInPicture = useCallback(async () => {
    const video = videoRef?.current;
    if (!video) return;
    
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsInPIP(false);
      } else {
        await video.requestPictureInPicture();
        setIsInPIP(true);
      }
    } catch (err) {
      console.error('PiP failed:', err);
      setError('Picture-in-Picture not supported');
    }
  }, [videoRef]);

  // Monitor PiP state
  useEffect(() => {
    const handlePiPEnter = () => setIsInPIP(true);
    const handlePiPExit = () => setIsInPIP(false);
    
    document.addEventListener('enterpictureinpicture', handlePiPEnter);
    document.addEventListener('leavepictureinpicture', handlePiPExit);
    
    return () => {
      document.removeEventListener('enterpictureinpicture', handlePiPEnter);
      document.removeEventListener('leavepictureinpicture', handlePiPExit);
    };
  }, []);

  // Start hosting with embedded video
  const startEmbeddedHost = useCallback(async (videoElement?: HTMLVideoElement) => {
    const targetVideo = videoElement || videoRef?.current;
    if (!targetVideo) {
      throw new Error('No video element available');
    }
    
    setHostingMode('embedded');
    setVideoUrl(targetVideo.src || null);
    
    // The sync engine will bind to this video element
    // Emit host:start event
    if (socketRef.current) {
      socketRef.current.emit('host:start', { 
        roomId, 
        mode: 'embedded',
        videoUrl: targetVideo.src 
      });
    }
  }, [roomId, videoRef]);

  // Start hosting with external URL
  const startExternalUrlHost = useCallback(async (url: string) => {
    setHostingMode('external-url');
    setVideoUrl(url);
    setError(null);
    
    // Emit host:start event
    if (socketRef.current) {
      socketRef.current.emit('host:start', { 
        roomId, 
        mode: 'external-url',
        videoUrl: url 
      });
    }
  }, [roomId]);

  // Select and play local video file
  const startLocalFileHost = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setHostingMode('embedded');
    setError(null);
    
    if (videoRef?.current) {
      videoRef.current.src = url;
      await videoRef.current.play();
    }
    
    if (socketRef.current) {
      socketRef.current.emit('host:start', { 
        roomId, 
        mode: 'embedded',
        videoUrl: url,
        isLocalFile: true 
      });
    }
    
    return url;
  }, [roomId, videoRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (screenShareRef.current) {
        screenShareRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    isHost,
    isScreenSharing,
    isInPIP,
    hostingMode,
    videoUrl,
    error,
    screenShareStream: screenShareStreamRef.current,
    checkHostStatus,
    requestScreenShare,
    endScreenShare,
    togglePictureInPicture,
    startEmbeddedHost,
    startExternalUrlHost,
    startLocalFileHost,
    clearError: () => setError(null),
  };
}

// Helper: detect mobile
export function isMobile(): boolean {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// Helper: detect if device has touch screen
export function hasTouchScreen(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Helper: get safe area insets for notched devices
export function getSafeAreaInsets(): {
  top: string;
  bottom: string;
  left: string;
  right: string;
} {
  if (typeof window === 'undefined') {
    return { top: '0px', bottom: '0px', left: '0px', right: '0px' };
  }
  
  // Default insets
  const insets = { top: '0px', bottom: '0px', left: '0px', right: '0px' };
  
  // Check for viewport segments (safe areas) - use type assertion for VisualViewport
  const vm = window.visualViewport as VisualViewport | undefined;
  if (vm) {
    const top = vm.top ?? 0;
    const left = vm.left ?? 0;
    const height = vm.height ?? window.innerHeight;
    const width = vm.width ?? window.innerWidth;
    
    return {
      top: `${top}px`,
      bottom: `${window.innerHeight - (height + top)}px`,
      left: `${left}px`,
      right: `${window.innerWidth - (width + left)}px`,
    };
  }
  
  return insets;
}

// Type declaration for VisualViewport (some properties may not be in all TS versions)
interface VisualViewport {
  top?: number;
  left?: number;
  width?: number;
  height?: number;
  scale?: number;
  pageTop?: number;
  pageLeft?: number;
}
