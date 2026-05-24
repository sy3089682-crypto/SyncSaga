interface TabState {
  hasVideo: boolean;
  roomId: string | null;
  connected: boolean;
}

class SyncSagaBackground {
  private tabStates: Map<number, TabState> = new Map();

  constructor() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const tabId = sender.tab?.id;
      if (!tabId) return;

      const state = this.tabStates.get(tabId) || { hasVideo: false, roomId: null, connected: false };
      if (message.type === 'VIDEO_DETECTED') state.hasVideo = message.payload.hasVideo;
      if (message.type === 'VIDEO_STATE') chrome.runtime.sendMessage(message);
      this.tabStates.set(tabId, state);
    });

    chrome.tabs.onRemoved.addListener((tabId) => this.tabStates.delete(tabId));
  }
}

new SyncSagaBackground();
