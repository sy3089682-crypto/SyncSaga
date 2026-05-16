/// <reference types="chrome"/>

interface TabState {
  connected: boolean;
  roomId: string | null;
  hasVideo: boolean;
}

class SyncSagaBackground {
  private tabStates: Map<number, TabState> = new Map();

  constructor() {
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (!sender.tab?.id) return;

      const tabId = sender.tab.id;
      const state = this.tabStates.get(tabId) || {
        connected: false,
        roomId: null,
        hasVideo: false,
      };

      switch (message.type) {
        case 'VIDEO_DETECTED':
          state.hasVideo = message.payload.hasVideo;
          break;
        case 'VIDEO_STATE':
          // Pass through to popup if open
          chrome.runtime.sendMessage(message).catch(() => {});
          break;
      }

      this.tabStates.set(tabId, state);
    });

    // Clean up disconnected tabs
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.tabStates.delete(tabId);
    });
  }

  getTabState(tabId: number): TabState | undefined {
    return this.tabStates.get(tabId);
  }

  getAllTabStates(): Map<number, TabState> {
    return this.tabStates;
  }
}

const background = new SyncSagaBackground();
