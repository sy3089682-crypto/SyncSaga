/// <reference types="chrome"/>

const $ = (id: string) => document.getElementById(id)!;

document.addEventListener('DOMContentLoaded', () => {
  const roomIdInput = $('roomId') as HTMLInputElement;
  const tokenInput = $('token') as HTMLInputElement;
  const connectBtn = $('connectBtn') as HTMLButtonElement;
  const disconnectBtn = $('disconnectBtn') as HTMLButtonElement;
  const statusDot = $('statusDot') as HTMLDivElement;
  const statusLabel = $('statusLabel') as HTMLSpanElement;
  const statusSub = $('statusSub') as HTMLSpanElement;
  const videoDetected = $('videoDetected') as HTMLDivElement;
  const videoStatus = $('videoStatus') as HTMLSpanElement;
  const roomStatus = $('roomStatus') as HTMLDivElement;
  const currentRoomName = $('currentRoomName') as HTMLDivElement;
  const currentRoomMeta = $('currentRoomMeta') as HTMLDivElement;
  const memberAvatars = $('memberAvatars') as HTMLDivElement;
  const currentUrl = $('currentUrl') as HTMLInputElement;
  const createRoomBtn = $('createRoomBtn') as HTMLButtonElement;
  const inviteLink = $('inviteLink') as HTMLInputElement;
  const copyInviteBtn = $('copyInviteBtn') as HTMLButtonElement;
  const copiedMsg = $('copiedMsg') as HTMLDivElement;

  chrome.storage.local.get(['roomId', 'token', 'connected', 'roomName', 'memberCount'], (result) => {
    if (result.roomId) roomIdInput.value = result.roomId;
    if (result.token) tokenInput.value = result.token;
    setConnected(result.connected || false);

    if (result.connected && result.roomName) {
      roomStatus.classList.add('show');
      currentRoomName.textContent = result.roomName;
      currentRoomMeta.textContent = `Members: ${result.memberCount || 1}`;
      inviteLink.value = `${window.location.origin}/room/${result.roomId}`;
    }
  });

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab.url) {
      currentUrl.value = tab.url;
    }
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'GET_STATE' })
        .then(() => {
          videoDetected.classList.add('show');
          videoStatus.textContent = 'Video detected ✓';
        })
        .catch(() => {
          videoStatus.textContent = 'No video on this page';
        });
    }
  });

  connectBtn.onclick = () => {
    const roomId = roomIdInput.value.trim();
    const token = tokenInput.value.trim();
    if (!roomId || !token) return;

    const actualRoomId = roomId.includes('/room/') ? roomId.split('/room/')[1]?.split('/')[0]?.split('?')[0] || roomId : roomId;

    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'CONNECT', payload: { roomId: actualRoomId, token } })
          .catch(() => {
            statusLabel.textContent = 'Error';
            statusSub.textContent = 'Refresh the page and try again';
            statusDot.style.background = '#ef4444';
          });
      }
    });

    chrome.storage.local.set({ roomId: actualRoomId, token, connected: true, roomName: actualRoomId, memberCount: 1 });
    setConnected(true);
    roomStatus.classList.add('show');
    currentRoomName.textContent = `Room ${actualRoomId.slice(0, 8)}...`;
    currentRoomMeta.textContent = 'Members: 1';
    inviteLink.value = `${window.location.origin}/room/${actualRoomId}`;
  };

  disconnectBtn.onclick = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab.id) chrome.tabs.sendMessage(tab.id, { type: 'DISCONNECT' });
    });
    chrome.storage.local.set({ connected: false });
    setConnected(false);
    roomStatus.classList.remove('show');
    inviteLink.value = '';
  };

  createRoomBtn.onclick = () => {
    const url = currentUrl.value;
    chrome.runtime.sendMessage({ type: 'CREATE_ROOM', payload: { url } });
    chrome.tabs.create({ url: `${getDashboardUrl()}/room/create?url=${encodeURIComponent(url)}` });
  };

  copyInviteBtn.onclick = () => {
    if (inviteLink.value) {
      navigator.clipboard.writeText(inviteLink.value).then(() => {
        copiedMsg.style.display = 'block';
        setTimeout(() => { copiedMsg.style.display = 'none'; }, 2000);
      });
    }
  };

  roomIdInput.addEventListener('input', () => {
    const val = roomIdInput.value.trim();
    if (val.includes('/room/')) {
      const extracted = val.split('/room/')[1]?.split('/')[0]?.split('?')[0] || val;
      roomIdInput.value = extracted;
    }
  });

  function setConnected(connected: boolean) {
    statusDot.className = 'dot' + (connected ? ' connected' : '');
    statusLabel.textContent = connected ? 'Connected' : 'Disconnected';
    statusSub.textContent = connected ? 'Syncing playback' : 'Connect to a room to start';
    connectBtn.style.display = connected ? 'none' : 'block';
    disconnectBtn.style.display = connected ? 'block' : 'none';
  }

  function getDashboardUrl(): string {
    return 'http://localhost:3000';
  }
});
