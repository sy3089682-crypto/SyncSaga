'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

export interface ConnectionState {
  quality: ConnectionQuality;
  latency: number;           // ms
  packetLoss: number;        // 0-1
  isConnected: boolean;
  isReconnecting: boolean;
  lastConnected: number | null;
  retryCount: number;
  bandwidth: number;         // estimated kbps
}

export interface UseConnectionStatusOptions {
  onQualityChange?: (quality: ConnectionQuality) => void;
  onReconnect?: () => void;
}

export function useConnectionStatus(options: UseConnectionStatusOptions = {}) {
  const { onQualityChange, onReconnect } = options;
  
  const [state, setState] = useState<ConnectionState>({
    quality: 'offline',
    latency: 0,
    packetLoss: 0,
    isConnected: false,
    isReconnecting: false,
    lastConnected: null,
    retryCount: 0,
    bandwidth: 0,
  });
  
  const [history, setHistory] = useState<{ latency: number; timestamp: number }[]>([]);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxHistoryLength = 100;

  // Update connection state
  const updateState = useCallback((updates: Partial<ConnectionState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      
      // Update quality based on latency and packet loss
      if (updates.latency !== undefined || updates.packetLoss !== undefined) {
        const quality = calculateQuality(
          newState.latency,
          newState.packetLoss
        );
        if (newState.quality !== quality) {
          newState.quality = quality;
          onQualityChange?.(quality);
        }
      }
      
      return newState;
    });
  }, [onQualityChange]);

  // Calculate quality from metrics
  const calculateQuality = useCallback((latency: number, packetLoss: number): ConnectionQuality => {
    if (latency === 0 && packetLoss === 0) {
      return 'offline';
    }
    
    if (packetLoss > 0.1) {
      return 'poor';
    }
    
    if (latency > 500) {
      return 'poor';
    }
    
    if (latency > 200) {
      return 'fair';
    }
    
    if (latency > 100) {
      return 'good';
    }
    
    return 'excellent';
  }, []);

  // Start connection monitoring
  const startMonitoring = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    
    // Initial state
    updateState({
      isConnected: true,
      quality: 'excellent',
      lastConnected: Date.now(),
      retryCount: 0,
    });
    
    // Start ping interval
    pingIntervalRef.current = setInterval(() => {
      // Simulate ping (in real implementation, this would ping server)
      const simulatedLatency = Math.random() * 100 + 20; // 20-120ms
      const simulatedPacketLoss = Math.random() * 0.02; // 0-2%
      
      setHistory(prev => {
        const newHistory = [...prev, { latency: simulatedLatency, timestamp: Date.now() }];
        if (newHistory.length > maxHistoryLength) {
          return newHistory.slice(-maxHistoryLength);
        }
        return newHistory;
      });
      
      // Calculate average latency
      const avgLatency = simulatedLatency; // In real implementation, calculate from history
      
      updateState({
        latency: Math.round(avgLatency),
        packetLoss: simulatedPacketLoss,
        bandwidth: Math.round(5000 - avgLatency * 10), // Simulated bandwidth
      });
    }, 5000); // Ping every 5 seconds
  }, [updateState]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    updateState({
      isConnected: false,
      quality: 'offline',
    });
  }, [updateState]);

  // Simulate reconnection
  const simulateReconnect = useCallback(async () => {
    updateState({ isReconnecting: true, retryCount: state.retryCount + 1 });
    
    // Simulate reconnect delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    updateState({
      isConnected: true,
      isReconnecting: false,
      lastConnected: Date.now(),
      quality: 'good',
      latency: 50,
      packetLoss: 0,
    });
    
    onReconnect?.();
  }, [state.retryCount, updateState, onReconnect]);

  // Get quality color
  const getQualityColor = useCallback((quality: ConnectionQuality): string => {
    switch (quality) {
      case 'excellent': return '#22c55e';
      case 'good': return '#84cc16';
      case 'fair': return '#eab308';
      case 'poor': return '#ef4444';
      case 'offline': return '#6b7280';
      default: return '#6b7280';
    }
  }, []);

  // Get quality label
  const getQualityLabel = useCallback((quality: ConnectionQuality): string => {
    switch (quality) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'fair': return 'Fair';
      case 'poor': return 'Poor';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  }, []);

  // Get latency display
  const getLatencyDisplay = useCallback((): string => {
    if (state.latency === 0) return '--';
    return `${state.latency}ms`;
  }, [state.latency]);

  // Auto-start monitoring
  useEffect(() => {
    startMonitoring();
    
    return () => {
      stopMonitoring();
    };
  }, [startMonitoring, stopMonitoring]);

  return {
    ...state,
    history,
    updateState,
    startMonitoring,
    stopMonitoring,
    simulateReconnect,
    getQualityColor,
    getQualityLabel,
    getLatencyDisplay,
  };
}
