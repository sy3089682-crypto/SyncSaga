/// <reference types="vitest/globals" />

interface Window {
  posthog?: {
    capture: (event: string, properties?: Record<string, any>) => void;
    identify: (userId: string, properties?: Record<string, any>) => void;
    reset: () => void;
  };
  Sentry?: {
    captureException: (error: any) => void;
    captureMessage: (message: string) => void;
  };
}

declare namespace chrome {
  namespace runtime {
    interface Manifest {
      version: string;
    }
    let id: string | undefined;
    function sendMessage(message: any): Promise<any>;
    interface MessageSender {
      tab?: Tab;
      frameId?: number;
      id?: string;
      url?: string;
      origin?: string;
    }
    interface MessageResponse {
      (response?: any): void;
    }
    type MessageCallback = (message: any, sender: MessageSender, sendResponse: MessageResponse) => void | Promise<any>;
    let onMessage: {
      addListener: (callback: MessageCallback) => void;
      removeListener: (callback: MessageCallback) => void;
    };
    function getManifest(): Manifest;
  }
  namespace tabs {
    interface Tab {
      id?: number;
      index: number;
      windowId: number;
      url?: string;
      title?: string;
      active: boolean;
    }
    function query(queryInfo: { active?: boolean; currentWindow?: boolean }): Promise<Tab[]>;
    function sendMessage(tabId: number, message: any, options?: any): Promise<any>;
  }
  namespace storage {
    interface StorageArea {
      get(keys: string | string[] | Record<string, any>): Promise<Record<string, any>>;
      set(items: Record<string, any>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
      clear(): Promise<void>;
    }
    let local: StorageArea;
    let sync: StorageArea;
  }
}
