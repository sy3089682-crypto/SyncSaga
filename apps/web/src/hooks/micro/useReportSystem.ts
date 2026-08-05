'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

export type ReportReason = 
  | 'spam' 
  | 'harassment' 
  | 'hate_speech' 
  | 'nudity' 
  | 'violence' 
  | 'copyright' 
  | 'misinformation' 
  | 'other';

export interface Report {
  id: string;
  reporterId: string;
  reporterUsername: string;
  targetType: 'user' | 'message' | 'clip' | 'reaction' | 'room';
  targetId: string;
  targetUsername?: string;
  reason: ReportReason;
  details?: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  createdAt: number;
  updatedAt?: number;
}

export interface ReportForm {
  targetType: Report['targetType'];
  targetId: string;
  targetUsername?: string;
  reason?: ReportReason;
  details?: string;
}

export interface UseReportSystemOptions {
  userId?: string;
  username?: string;
  onReportSubmitted?: (report: Report) => void;
}

export function useReportSystem(options: UseReportSystemOptions = {}) {
  const { userId = '', username = 'User', onReportSubmitted } = options;
  
  const [reports, setReports] = useState<Report[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  
  const reportFormRef = useRef<ReportForm | null>(null);
  const socketRef = useRef<any>(null);

  // Initialize socket for report updates
  useEffect(() => {
    const initSocket = async () => {
      try {
        const socket = await getSocket();
        socketRef.current = socket;
        
        socket.on('report:update', (report: Report) => {
          setReports(prev => {
            const existing = prev.find(r => r.id === report.id);
            if (existing) {
              return prev.map(r => r.id === report.id ? report : r);
            }
            return [...prev, report];
          });
          
          if (report.reporterId === userId) {
            onReportSubmitted?.(report);
          }
        });
        
      } catch (err) {
        console.error('Failed to initialize report socket:', err);
      }
    };
    
    initSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off('report:update');
      }
    };
  }, [userId, onReportSubmitted]);

  // Open report form
  const openReportForm = useCallback((targetType: Report['targetType'], targetId: string, targetUsername?: string) => {
    reportFormRef.current = {
      targetType,
      targetId,
      targetUsername,
    };
    setShowReportForm(true);
  }, []);

  // Close report form
  const closeReportForm = useCallback(() => {
    setShowReportForm(false);
    reportFormRef.current = null;
  }, []);

  // Submit report
  const submitReport = useCallback(async (form: ReportForm): Promise<Report | null> => {
    if (!userId) {
      setError('You must be logged in to report');
      return null;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await api.post<{ report: Report }>('/api/reports', {
        targetType: form.targetType,
        targetId: form.targetId,
        targetUsername: form.targetUsername || username,
        reason: form.reason || 'other',
        details: form.details,
        reporterId: userId,
        reporterUsername: username,
      });

      const report = response.report;
      setReports(prev => [report, ...prev]);
      onReportSubmitted?.(report);

      return report;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit report';
      setError(errorMessage);
      return null;
    } finally {
      setIsSubmitting(false);
      setShowReportForm(false);
      reportFormRef.current = null;
    }
  }, [userId, username, onReportSubmitted]);

  // Get reports for target
  const getReportsForTarget = useCallback((targetType: Report['targetType'], targetId: string): Report[] => {
    return reports.filter(r => r.targetType === targetType && r.targetId === targetId);
  }, [reports]);

  // Get user's reports
  const getUserReports = useCallback((): Report[] => {
    return reports.filter(r => r.reporterId === userId);
  }, [reports, userId]);

  // Check if already reported
  const hasReported = useCallback((targetType: Report['targetType'], targetId: string): boolean => {
    return reports.some(r => r.targetType === targetType && r.targetId === targetId);
  }, [reports]);

  // Get reason options
  const getReasonOptions = useCallback((): { value: ReportReason; label: string; description: string }[] => {
    return [
      { value: 'spam', label: 'Spam', description: 'Unwanted or repetitive content' },
      { value: 'harassment', label: 'Harassment', description: 'Bullying or threatening behavior' },
      { value: 'hate_speech', label: 'Hate Speech', description: 'Content that promotes hate' },
      { value: 'nudity', label: 'Nudity', description: 'Sexually explicit content' },
      { value: 'violence', label: 'Violence', description: 'Glorification of violence' },
      { value: 'copyright', label: 'Copyright', description: 'Unauthorized copyrighted content' },
      { value: 'misinformation', label: 'Misinformation', description: 'False or misleading information' },
      { value: 'other', label: 'Other', description: 'Something else inappropriate' },
    ];
  }, []);

  // Get status label
  const getStatusLabel = useCallback((status: Report['status']): string => {
    switch (status) {
      case 'pending': return 'Pending Review';
      case 'reviewing': return 'Under Review';
      case 'resolved': return 'Resolved';
      case 'dismissed': return 'Dismissed';
      default: return status;
    }
  }, []);

  // Get status color
  const getStatusColor = useCallback((status: Report['status']): string => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'reviewing': return '#3b82f6';
      case 'resolved': return '#22c55e';
      case 'dismissed': return '#6b7280';
      default: return '#6b7280';
    }
  }, []);

  return {
    reports,
    isSubmitting,
    error,
    selectedReport,
    showReportForm,
    openReportForm,
    closeReportForm,
    submitReport,
    getReportsForTarget,
    getUserReports,
    hasReported,
    getReasonOptions,
    getStatusLabel,
    getStatusColor,
  };
}
