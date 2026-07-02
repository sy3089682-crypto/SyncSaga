'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Mic, MicOff, Play, Pause, MessageCircle, Send } from 'lucide-react';

/* ============================================================
   SyncSaga — Landing / Gathering
   One vertical composition. One live room. One action.
   ============================================================ */

const CHAT_SEED = [
  { name: 'Mira', text: 'this OP goes so hard every single time' },
  { name: 'Rei', text: 'wait pause i need to grab snacks' },
  { name: 'Aya', text: 'that scene destroyed me' },
  { name: 'Kaito', text: 'ok resynced everyone, we good now?' },
  { name: 'Mira', text: 'perfect. frame for frame' },
];

const PRESENCE_EVENTS = [
  'Mira is speaking',
  'Rei reacted',
  'Aya is speaking',
  'Kaito resynced everyone',
  'Daichi joined',
];

export default function LandingPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<'gathering' | 'room'>('gathering');
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(862);
  const [chatOpen, setChatOpen] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState(CHAT_SEED);
  const [notifications, setNotifications] = useState<{id: number; text: string}[]>([]);
  const [showStartInput, setShowStartInput] = useState(false);
  const [startValue, setStartValue] = useState('');
  const [showChatHint, setShowChatHint] = useState(false);
  const [idle, setIdle] = useState(false);

  const DUR = 1440;
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifIdRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width:640px)').matches;
  const isTablet = typeof window !== 'undefined' && window.matchMedia('(min-width:641px) and (max-width:1024px)').matches;

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  /* ---- Playback ---- */
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setTime(t => {
        if (t >= DUR) { setPlaying(false); return DUR; }
        return t + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [playing]);

  /* ---- Idle overlay fading (desktop) ---- */
  const resetIdle = useCallback(() => {
    setIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (playing && !isMobile && !isTablet) {
      idleTimerRef.current = setTimeout(() => setIdle(true), 3500);
    }
  }, [playing, isMobile, isTablet]);

  useEffect(() => { resetIdle(); }, [playing, resetIdle]);

  /* ---- Enter / leave room ---- */
  const enterRoom = () => {
    setScreen('room');
    setPlaying(true);
    pushNotification('Kaito is hosting');
    setTimeout(() => pushNotification('Mira joined'), 2200);
    if (!isMobile && !isTablet) {
      setTimeout(() => setShowChatHint(true), 1000);
      setTimeout(() => setShowChatHint(false), 5000);
    }
  };

  const leaveRoom = () => {
    setScreen('gathering');
    setPlaying(false);
    setChatOpen(false);
    setShowChatHint(false);
  };

  /* ---- Notifications ---- */
  const pushNotification = (text: string) => {
    const id = notifIdRef.current++;
    setNotifications(prev => [...prev, { id, text }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  useEffect(() => {
    if (screen !== 'room' || !playing) return;
    let idx = 0;
    const interval = setInterval(() => {
      pushNotification(PRESENCE_EVENTS[idx % PRESENCE_EVENTS.length]);
      idx++;
    }, 9000);
    return () => clearInterval(interval);
  }, [screen, playing]);

  /* ---- Chat ---- */
  const sendMessage = () => {
    const v = chatInput.trim();
    if (!v) return;
    setMessages(prev => [...prev, { name: 'You', text: v }]);
    setChatInput('');
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ---- Keyboard ---- */
  useEffect(() => {
    if (screen !== 'room') return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'c' || e.key === 'C') {
        if (!isMobile && !isTablet) setChatOpen(o => !o);
      } else if (e.key === 'Escape') {
        if (chatOpen) setChatOpen(false);
        else leaveRoom();
      } else if (e.key === ' ') {
        e.preventDefault();
        setPlaying(p => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [screen, chatOpen, isMobile, isTablet]);

  /* ---- Seek ---- */
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - r.left) / r.width;
    setTime(Math.max(0, Math.min(DUR, pct * DUR)));
  };

  const pct = (time / DUR) * 100;
  const latestMsg = messages[messages.length - 1];

  /* =========================================================
     RENDER — GATHERING
     ========================================================= */
  if (screen === 'gathering') {
    return (
      <div className="min-h-screen flex flex-col max-w-[880px] mx-auto px-8 py-8 pb-16 sm:pb-8">
        <h1 className="syncsaga-wordmark">SyncSaga</h1>

        <div className="mt-14 cursor-pointer group" onClick={enterRoom}>
          <div className="syncsaga-still aspect-video group-hover:shadow-2xl transition-shadow duration-300" />
          <div className="mt-6 flex items-end justify-between gap-6 flex-wrap">
            <div>
              <h2 className="syncsaga-show-title">Emberfall</h2>
              <p className="syncsaga-meta-line">Episode 12 · 14:22 in</p>
              <p className="syncsaga-people-line">Kaito, Mira, Rei and 4 others</p>
            </div>
            <button className="syncsaga-join-btn">Join</button>
          </div>
        </div>

        <div className="mt-auto pt-16">
          {!showStartInput ? (
            <button
              className="syncsaga-start-link"
              onClick={() => setShowStartInput(true)}
            >
              or start a room →
            </button>
          ) : (
            <input
              type="text"
              placeholder="What are you watching?"
              value={startValue}
              onChange={e => setStartValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && startValue.trim()) enterRoom();
                if (e.key === 'Escape') { setShowStartInput(false); setStartValue(''); }
              }}
              autoFocus
              className="syncsaga-start-input"
            />
          )}
        </div>

        {/* Mobile bottom tabs */}
        <nav className="syncsaga-mobile-tabs">
          <button className="syncsaga-tab active">Watch</button>
          <button className="syncsaga-tab">Rooms</button>
          <button className="syncsaga-tab">You</button>
        </nav>
      </div>
    );
  }

  /* =========================================================
     RENDER — ROOM
     ========================================================= */
  return (
    <div
      className="fixed inset-0 bg-black cursor-pointer"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-no-toggle]')) return;
        if (isMobile) {
          if (e.clientX > window.innerWidth * 0.6) {
            setChatOpen(o => !o);
            return;
          }
        }
        if (chatOpen && !isTablet) { setChatOpen(false); return; }
        setPlaying(p => !p);
      }}
      onMouseMove={() => resetIdle()}
    >
      <div className="syncsaga-stall absolute inset-0" />

      {/* Top overlay */}
      <div className={`absolute top-0 left-0 right-0 flex items-center justify-between p-6 z-10 transition-opacity duration-400 ${idle ? 'opacity-0 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-4">
          <button
            className="syncsaga-back-btn"
            onClick={(e) => { e.stopPropagation(); leaveRoom(); }}
            data-no-toggle
            aria-label="Leave room"
          >
            <ChevronLeft className="w-[18px] h-[18px]" />
          </button>
          <span className="text-[15px] font-semibold text-ink">Friday night watch</span>
        </div>
        <span className="syncsaga-sync-status">in sync · 42ms</span>
      </div>

      {/* Notifications */}
      <div className="absolute top-20 left-7 z-8 flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className="syncsaga-notification show">
            {n.text}
          </div>
        ))}
      </div>

      {/* Chat hint */}
      {showChatHint && !isMobile && !isTablet && (
        <div className="syncsaga-chat-hint show">press C for chat</div>
      )}

      {/* Pause indicator */}
      {!playing && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-5">
          <Play className="w-8 h-8 text-ink opacity-55" />
        </div>
      )}

      {/* Chat preview (desktop, when chat closed) */}
      {!chatOpen && !isMobile && !isTablet && (
        <div className="absolute bottom-20 left-7 z-8 opacity-55 pointer-events-none max-w-[300px] truncate">
          <span className="font-semibold text-ink">{latestMsg?.name}</span>
          <span className="text-ink-faint mx-1.5">·</span>
          <span className="text-ink-soft">{latestMsg?.text}</span>
        </div>
      )}

      {/* Chat overlay — desktop: right panel, mobile: bottom sheet */}
      {chatOpen && !isTablet && (
        <div
          className={`syncsaga-chat-overlay ${isMobile ? 'syncsaga-chat-sheet' : ''}`}
          data-no-toggle
          onClick={e => e.stopPropagation()}
        >
          <div className="flex-1 overflow-y-auto flex flex-col gap-[18px] pb-4 syncsaga-chat-scroll">
            {messages.map((msg, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-ink">{msg.name}</span>
                <span className="text-[13.5px] leading-[1.5] text-ink-soft">{msg.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="pt-4">
            <input
              type="text"
              placeholder="Say something…"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
              className="syncsaga-chat-input"
              data-no-toggle
            />
          </div>
        </div>
      )}

      {/* Tablet persistent chat */}
      {isTablet && (
        <div
          className="absolute top-0 right-0 bottom-0 w-[35%] bg-[rgba(14,14,16,0.88)] p-6 pt-20 flex flex-col z-12"
          data-no-toggle
          onClick={e => e.stopPropagation()}
        >
          <div className="flex-1 overflow-y-auto flex flex-col gap-[18px] pb-4 syncsaga-chat-scroll">
            {messages.map((msg, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-ink">{msg.name}</span>
                <span className="text-[13.5px] leading-[1.5] text-ink-soft">{msg.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="pt-4">
            <input
              type="text"
              placeholder="Say something…"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
              className="syncsaga-chat-input"
            />
          </div>
        </div>
      )}

      {/* Bottom overlay — scrubber */}
      <div className={`absolute bottom-0 left-0 ${isTablet ? 'right-[35%]' : 'right-0'} p-5 z-10 transition-opacity duration-400 ${idle ? 'opacity-0 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-3.5">
          <div className="syncsaga-track flex-1" onClick={(e) => { e.stopPropagation(); seek(e); }} data-no-toggle>
            <div className="syncsaga-played" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-ink-soft tabular-nums flex-none">
            {fmt(time)} / {fmt(DUR)}
          </span>
        </div>
      </div>

      {/* Mic button — desktop/tablet floating */}
      {!isMobile && (
        <button
          className={`syncsaga-mic-btn ${isTablet ? '!top-6 !bottom-auto' : ''} ${micMuted ? 'muted' : ''}`}
          onClick={(e) => { e.stopPropagation(); setMicMuted(m => !m); }}
          data-no-toggle
          aria-label="Toggle microphone"
        >
          {micMuted ? <MicOff className="w-[18px] h-[18px]" /> : <Mic className="w-[18px] h-[18px]" />}
        </button>
      )}

      {/* Mobile control bar */}
      {isMobile && (
        <div className="syncsaga-mobile-controls" data-no-toggle>
          <button onClick={(e) => { e.stopPropagation(); setPlaying(p => !p); }} className="syncsaga-mc-btn">
            {playing ? <Pause className="w-[22px] h-[22px]" /> : <Play className="w-[22px] h-[22px]" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setMicMuted(m => !m); }}
            className={`syncsaga-mc-btn ${micMuted ? 'muted' : ''}`}
          >
            {micMuted ? <MicOff className="w-[22px] h-[22px]" /> : <Mic className="w-[22px] h-[22px]" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); setChatOpen(o => !o); }} className="syncsaga-mc-btn">
            <MessageCircle className="w-[22px] h-[22px]" />
          </button>
        </div>
      )}
    </div>
  );
}
