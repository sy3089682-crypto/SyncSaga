/// <reference types="chrome"/>

document.addEventListener('DOMContentLoaded', () => {
  const roomIdInput = document.getElementById('roomId') as HTMLInputElement;
  const tokenInput = document.getElementById('token') as HTMLInputElement;
  const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement;
  const disconnectBtn = document.getElementById('disconnectBtn') as HTMLButtonElement;
  const statusDot = document.getElementById('statusDot') as HTMLDivElement;
  const statusText = document.getElementById('statusText') as HTMLSpanElement;
  const videoDetected = document.getElementById('videoDetected') as HTMLDivElement;

  // Load stored values
  chrome.storage.local.get(['roomId', 'token', 'connected'], (result) => {
    if (result.roomId) roomIdInput.value = result.roomId;
    if (result.token) tokenInput.value = result.token;
    updateConnectionStatus(result.connected || false);
  });

  // Check for video on current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'GET_STATE' })
        .then((response) => {
          if (response?.payload?.hasVideo) {
            videoDetected.classList.add('show');
          }
        })
        .catch(() => {});
    }
  });

  connectBtn.addEventListener('click', () => {
    const roomId = roomIdInput.value.trim();
    const token = tokenInput.value.trim();

    if (!roomId || !token) return;

    // Send to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'CONNECT',
          roomId,
          token,
        }).catch(() => {
          // Content script not loaded
          statusText.textContent = 'Error: Refresh the anime page';
          statusDot.style.background = '#ef4444';
        });
      }
    });

    // Store credentials
    chrome.storage.local.set({ roomId, token, connected: true });
    updateConnectionStatus(true);
  });

  disconnectBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'DISCONNECT' }).catch(() => {});
      }
    });

    chrome.storage.local.set({ connected: false });
    updateConnectionStatus(false);
  });

  function updateConnectionStatus(connected: boolean) {
    if (connected) {
      statusDot.style.background = '#10b981';
      statusText.textContent = 'Connected';
      connectBtn.style.display = 'none';
      disconnectBtn.style.display = 'block';
    } else {
      statusDot.style.background = '#ef4444';
      statusText.textContent = 'Disconnected';
      connectBtn.style.display = 'block';
      disconnectBtn.style.display = 'none';
    }
  }
});
