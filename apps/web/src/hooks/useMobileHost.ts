'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

interface MobileHostOptions {
  roomId: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

export function useMobileHost(options: MobileHostOptions) {
  const { roomId, videoRef } = options;
  const { user } = useAuth();

  const [isHost, setIsHost] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isInPIP, setIsInPIP] = useState(false);
  const [hostingMode, setHostingMode] = useState<'embedded' | 'screen-share' | 'external-url'>('embedded');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const screenShareRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<any>(null);
  const screenShareStreamRef = useRef<MediaStream | null>(null);

  const checkHostStatus = useCallback(async () => {
    if (!user?.id) {
      setIsHost(false);
      return;
    }

    // Use the authoritative REST room record first. This avoids depending on
    // Socket.IO timing and guarantees the host control can render as soon as
    // the authenticated room page loads.
    try {
      const room = await api.get<{ host_id: string; co_hosts?: string[] }>(`/api/rooms/${roomId}`);
      const host = room.host_id === user.id || (Array.isArray(room.co_hosts) && room.co_hosts.includes(user.id));
      setIsHost(Boolean(host));
    } catch (err) {
      console.warn('REST host check failed; falling back to room state:', err);
    }

    // Keep Socket.IO as the live fallback/update path.
    try {
      const socket = await getSocket();
      socketRef.current = socket;

      const updateFromRoom = (room: any) => {
        if (!room || !user?.id) return;
        const host =
          room.host_id === user.id ||
          (Array.isArray(room.co_hosts) && room.co_hosts.includes(user.id));
        setIsHost(Boolean(host));
      };

      socket.on('room:state', updateFromRoom);
      socket.emit('room:join', { roomId });
    } catch (err) {
      console.warn('Socket host check failed:', err);
    }
  }, [roomId, user?.id]);

  useEffect(() => {
    void checkHostStatus();
    return () => {
      const socket = socketRef.current;
      if (socket) socket.off('room:state');
    };
  }, [checkHostStatus]);

  const requestScreenShare = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Screen sharing not supported on this browser');
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' } as MediaTrackConstraints,
        audio: true,
      });

      screenShareRef.current = stream;
      screenShareStreamRef.current = stream;
      setIsScreenSharing(true);
      setHostingMode('screen-share');
      setError(null);

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => endScreenShare());
      }

      return stream;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start screen share';
      console.error('Screen share failed:', err);
      setError(errorMessage);
      throw err;
    }
  }, []);

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

  const startEmbeddedHost = useCallback(async (videoElement?: HTMLVideoElement) => {
    const targetVideo = videoElement || videoRef?.current;
    if (!targetVideo) throw new Error('No video element available');

    setHostingMode('embedded');
    setVideoUrl(targetVideo.src || null);
    socketRef.current?.emit('host:start', {
      roomId,
      mode: 'embedded',
      videoUrl: targetVideo.src,
    });
  }, [roomId, videoRef]);

  const startExternalUrlHost = useCallback(async (url: string) => {
    setHostingMode('external-url');
    setVideoUrl(url);
    setError(null);
    socketRef.current?.emit('host:start', {
      roomId,
      mode: 'external-url',
      videoUrl: url,
    });
  }, [roomId]);

  const startLocalFileHost = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setHostingMode('embedded');
    setError(null);

    if (videoRef?.current) {
      videoRef.current.src = url;
      await videoRef.current.play();
    }

    socketRef.current?.emit('host:start', {
      roomId,
      mode: 'embedded',
      videoUrl: url,
      isLocalFile: true,
    });

    return url;
  }, [roomId, videoRef]);

  useEffect(() => () => {
    screenShareRef.current?.getTracks().forEach(track => track.stop());
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

export function isMobile(): boolean {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function hasTouchScreen(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function getSafeAreaInsets(): {
  top: string;
  bottom: string;
  left: string;
  right: string;
} {
  if (typeof window === 'undefined') {
    return { top: '0px', bottom: '0px', left: '0px', right: '0px' };
  }

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

  return { top: '0px', bottom: '0px', left: '0px', right: '0px' };
}

interface VisualViewport {
  top?: number;
  left?: number;
  width?: number;
  height?: number;
  scale?: number;
  pageTop?: number;
  pageLeft?: number;
}
