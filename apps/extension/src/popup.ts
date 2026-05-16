/// <reference types="chrome"/>

const $ = (id: string) => document.getElementById(id)!;

document.addEventListener('DOMContentLoaded', () => {
  const roomIdInput = $('roomId') as HTMLInputElement;
  const tokenInput = $('token') as HTMLInputElement;
  const connectBtn = $('connectBtn') as HTMLButtonElement;
  const disconnectBtn = $('disconnectBtn') as HTMLButtonElement;
  const statusDot = $('statusDot') as HTMLDivElement;
  const statusText = $('statusText') as HTMLSpanElement;
  const videoDetected = $('videoDetected') as HTMLDivElement;

  chrome.storage.local.get(['roomId', 'token', 'connected'], (result) => {
    if (result.roomId) roomIdInput.value = result.roomId;
    if (result.token) tokenInput.value = result.token;
    setConnected(result.connected || false);
  });

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'GET_STATE' })
        .then(() => videoDetected.classList.add('show'))
        .catch(() => {});
    }
  });

  connectBtn.onclick = () => {
    const roomId = roomIdInput.value.trim();
    const token = tokenInput.value.trim();
    if (!roomId || !token) return;

    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'CONNECT', payload: { roomId, token } })
          .catch(() => { statusText.textContent = 'Error: refresh the page'; statusDot.style.background = '#ef4444'; });
      }
    });

    chrome.storage.local.set({ roomId, token, connected: true });
    setConnected(true);
  };

  disconnectBtn.onclick = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab.id) chrome.tabs.sendMessage(tab.id, { type: 'DISCONNECT' });
    });
    chrome.storage.local.set({ connected: false });
    setConnected(false);
  };

  function setConnected(connected: boolean) {
    const green = '#10b981', red = '#ef4444';
    statusDot.style.background = connected ? green : red;
    statusText.textContent = connected ? 'Connected' : 'Disconnected';
    connectBtn.style.display = connected ? 'none' : 'block';
    disconnectBtn.style.display = connected ? 'block' : 'none';
  }
});
