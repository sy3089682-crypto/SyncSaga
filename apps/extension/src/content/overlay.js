// SyncSaga Player Overlay — injected into video sites
(function() {
  if (document.getElementById('syncsaga-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'syncsaga-overlay';
  overlay.innerHTML = `
    <span class="sync-dot"></span>
    <span>Watch together on SyncSaga</span>
    <button onclick="window.open('https://syncsaga.vercel.app','_blank')">Open</button>
  `;
  document.body.appendChild(overlay);

  setTimeout(() => {
    if (overlay) overlay.style.opacity = '0.6';
    setTimeout(() => { if (overlay) overlay.style.opacity = '1'; }, 5000);
  }, 30000);
})();
