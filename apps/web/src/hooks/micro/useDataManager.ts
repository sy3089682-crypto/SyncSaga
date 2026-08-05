'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface ExportData {
  version: string;
  exportedAt: number;
  userId?: string;
  settings: {
    theme: unknown;
    accessibility: unknown;
    notifications: unknown;
    preferences: unknown;
  };
  favorites: {
    rooms: string[];
    anime: string[];
    users: string[];
  };
  watchHistory: {
    episodes: unknown[];
    rooms: unknown[];
    timestamps: unknown[];
  };
  achievements: {
    unlocked: string[];
    progress: Record<string, number>;
  };
}

export interface ImportData {
  version: string;
  exportedAt?: number;
  settings?: Partial<ExportData['settings']>;
  favorites?: Partial<ExportData['favorites']>;
  watchHistory?: Partial<ExportData['watchHistory']>;
  achievements?: Partial<ExportData['achievements']>;
}

export interface UseDataManagerOptions {
  userId?: string;
  onExportComplete?: (data: ExportData) => void;
  onImportComplete?: (data: ImportData) => void;
}

export function useDataManager(options: UseDataManagerOptions = {}) {
  const { userId, onExportComplete, onImportComplete } = options;
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<ExportData | null>(null);
  const [lastImport, setLastImport] = useState<ImportData | null>(null);

  // Export all data
  const exportData = useCallback(async (includeHistory: boolean = true): Promise<ExportData> => {
    setIsExporting(true);
    setError(null);
    setExportProgress(0);

    try {
      setExportProgress(10);
      
      // Gather data
      const data: ExportData = {
        version: '1.0.0',
        exportedAt: Date.now(),
        userId,
        settings: {
          theme: {}, // Would get from theme manager
          accessibility: {}, // Would get from accessibility
          notifications: {}, // Would get from notification manager
          preferences: {}, // Would get from preferences
        },
        favorites: {
          rooms: [], // Would get from room manager
          anime: [], // Would get from anime manager
          users: [], // Would get from social manager
        },
        watchHistory: {
          episodes: [], // Would get from watch history
          rooms: [], // Would get from room history
          timestamps: [], // Would get from timestamp history
        },
        achievements: {
          unlocked: [], // Would get from achievements
          progress: {}, // Would get from achievement progress
        },
      };

      setExportProgress(50);
      
      // In real implementation, would gather actual data from all managers
      
      setExportProgress(90);
      
      // Convert to JSON
      const jsonData = JSON.stringify(data, null, 2);
      
      // Download file
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `syncsaga_backup_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportProgress(100);
      setLastExport(data);
      onExportComplete?.(data);
      
      return data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [userId, onExportComplete]);

  // Export specific data
  const exportSettings = useCallback(async (): Promise<void> => {
    setIsExporting(true);
    
    try {
      const data: Partial<ExportData> = {
        version: '1.0.0',
        exportedAt: Date.now(),
        settings: {
          theme: {},
          accessibility: {},
          notifications: {},
          preferences: {},
        },
      };
      
      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `syncsaga_settings_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export settings');
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Import data
  const importData = useCallback(async (file: File, merge: boolean = true): Promise<ImportData> => {
    setIsImporting(true);
    setError(null);
    setImportProgress(0);

    try {
      setImportProgress(10);
      
      const text = await file.text();
      const data: ImportData = JSON.parse(text);
      
      if (!data.version) {
        throw new Error('Invalid backup file');
      }
      
      setImportProgress(30);
      
      // Validate data
      if (data.settings) {
        // Apply settings
        setImportProgress(50);
      }
      
      if (data.favorites && merge) {
        // Merge favorites
        setImportProgress(70);
      }
      
      if (data.watchHistory && merge) {
        // Merge watch history
        setImportProgress(85);
      }
      
      if (data.achievements && merge) {
        // Merge achievements
        setImportProgress(95);
      }
      
      setLastImport(data);
      onImportComplete?.(data);
      setImportProgress(100);
      
      return data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  }, [onImportComplete]);

  // Import from clipboard
  const importFromClipboard = useCallback(async (): Promise<ImportData | null> => {
    try {
      const text = await navigator.clipboard.readText();
      const data: ImportData = JSON.parse(text);
      return importData(new File([], 'clipboard'), true);
    } catch (err) {
      setError('Failed to read from clipboard');
      return null;
    }
  }, [importData]);

  // Share export
  const shareExport = useCallback(async (): Promise<boolean> => {
    try {
      const data = await exportData(false);
      const jsonData = JSON.stringify(data, null, 2);
      
      if (navigator.share) {
        await navigator.share({
          title: 'SyncSaga Backup',
          text: 'Here is my SyncSaga backup data',
          files: [new File([jsonData], 'syncsaga_backup.json', { type: 'application/json' })],
        });
        return true;
      } else {
        await navigator.clipboard.writeText(jsonData);
        return true;
      }
    } catch (err) {
      setError('Failed to share export');
      return false;
    }
  }, [exportData]);

  // Clear all data
  const clearAllData = useCallback(async (confirm: boolean = false): Promise<boolean> => {
    if (!confirm) {
      return false;
    }
    
    try {
      // Clear localStorage
      localStorage.clear();
      
      // Clear session storage
      sessionStorage.clear();
      
      // Clear IndexedDB if used
      if (window.indexedDB) {
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        }
      }
      
      return true;
    } catch (err) {
      setError('Failed to clear data');
      return false;
    }
  }, []);

  // Get export status
  const getExportStatus = useCallback((): { isExporting: boolean; progress: number; error: string | null } => {
    return { isExporting, progress: exportProgress, error };
  }, [isExporting, exportProgress, error]);

  // Get import status
  const getImportStatus = useCallback((): { isImporting: boolean; progress: number; error: string | null } => {
    return { isImporting, progress: importProgress, error };
  }, [isImporting, importProgress, error]);

  // Check if backup is valid
  const validateBackup = useCallback((file: File): Promise<{ valid: boolean; version?: string; error?: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          
          if (!data.version) {
            resolve({ valid: false, error: 'Invalid backup file' });
            return;
          }
          
          resolve({ valid: true, version: data.version });
        } catch (err) {
          resolve({ valid: false, error: 'Invalid JSON file' });
        }
      };
      
      reader.onerror = () => {
        resolve({ valid: false, error: 'Failed to read file' });
      };
      
      reader.readAsText(file);
    });
  }, []);

  return {
    isExporting,
    isImporting,
    exportProgress,
    importProgress,
    error,
    lastExport,
    lastImport,
    exportData,
    exportSettings,
    importData,
    importFromClipboard,
    shareExport,
    clearAllData,
    getExportStatus,
    getImportStatus,
    validateBackup,
  };
}
