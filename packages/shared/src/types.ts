export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  status: 'online' | 'offline' | 'away' | 'watching';
  custom_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
}

export interface Room {
  id: string;
  name: string;
  description: string | null;
  banner_url: string | null;
  is_private: boolean;
  max_users: number;
  host_id: string;
  co_hosts: string[];
  current_episode: string | null;
  current_episode_number: number | null;
  current_timestamp: number;
  playback_state: 'playing' | 'paused' | 'buffering';
  playback_speed: number;
  created_at: string;
  updated_at: string;
  anime_title: string | null;
  anime_media_id: number | null;
  anime_cover_url: string | null;
  anime_episode_count: number | null;
  sync_lock: boolean;
  allow_soundboard: boolean;
  allow_reactions: boolean;
  skip_intro_votes: Record<string, boolean>;
  banned_users: string[];
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  role: 'host' | 'co_host' | 'member';
  joined_at: string;
}

export interface Message {
  id: string;
  room_id: string | null;
  sender_id: string;
  recipient_id: string | null;
  content: string;
  type: 'text' | 'gif' | 'reaction' | 'system';
  reactions: Record<string, string[]>;
  created_at: string;
}

export interface SyncEvent {
  room_id: string;
  user_id: string;
  type: 'play' | 'pause' | 'seek' | 'speed' | 'episode' | 'fullscreen' | 'buffering' | 'ready';
  timestamp: number;
  playback_speed?: number;
  episode?: string;
  server_time?: number;
}

export interface PresenceEvent {
  user_id: string;
  status: 'online' | 'offline' | 'away' | 'watching';
  current_room_id: string | null;
  activity: string | null;
}

export interface VoiceParticipant {
  user_id: string;
  is_muted: boolean;
  is_speaking: boolean;
  is_deafened: boolean;
}

export interface AnimeEpisode {
  id: string;
  title: string;
  number: number;
  source_url: string;
  duration: number;
  thumbnail?: string;
  synopsis?: string;
  airDate?: string;
}

export interface AnimeMedia {
  id: number;
  idMal?: number;
  title: {
    romaji?: string;
    english?: string;
    native?: string;
  };
  coverImage: {
    large: string;
    medium: string;
    extraLarge?: string;
    color?: string;
  };
  bannerImage?: string;
  description?: string;
  episodes?: number;
  duration?: number;
  status?: string;
  season?: string;
  seasonYear?: number;
  format?: string;
  genres?: string[];
  tags?: { name: string; rank: number }[];
  averageScore?: number;
  meanScore?: number;
  popularity?: number;
  trending?: number;
  studios?: { nodes: { id: number; name: string; isAnimationStudio: boolean }[] };
  startDate?: { year: number; month: number; day: number };
  endDate?: { year: number; month: number; day: number };
  nextAiringEpisode?: {
    airingAt: number;
    timeUntilAiring: number;
    episode: number;
  };
  airingSchedule?: {
    nodes: { id: number; airingAt: number; episode: number }[];
  };
  synonyms?: string[];
  isAdult?: boolean;
  siteUrl?: string;
  trailer?: {
    id: string;
    site: string;
    thumbnail: string;
  };
  rankings?: {
    rank: number;
    type: string;
    context: string;
    year?: number;
    season?: string;
  }[];
}

export interface AnimeCharacter {
  id: number;
  role: string;
  name: {
    full: string;
    native?: string;
  };
  image: {
    large: string;
    medium: string;
  };
  voiceActors: {
    id: number;
    name: { full: string; native?: string };
    image: { large: string; medium: string };
    language: string;
  }[];
}

export interface AnimeStaff {
  id: number;
  name: { full: string; native?: string };
  image: { large: string; medium: string };
  primaryOccupations: string[];
}

export interface AnimeTheme {
  type: 'opening' | 'ending';
  text: string;
  artist?: string;
}

export interface AnimeSong {
  title: string;
  artist: string;
  type: 'opening' | 'ending';
  episode?: number;
  videoUrl?: string;
}

export interface RoomAnimeInfo {
  mediaId: number | null;
  title: string;
  episode: number;
  episodeTitle?: string;
  timestamp: number;
}

export interface ScheduledRoom {
  id: string;
  roomId: string;
  animeTitle: string;
  episode: number;
  scheduledAt: string;
  createdBy: string;
  inviteCode: string;
}

export interface WatchActivity {
  user_id: string;
  anime_title: string;
  episode_number: number;
  timestamp: number;
  started_at: string;
}

export type SocketEventMap = {
  'room:join': { roomId: string; password?: string };
  'room:leave': { roomId: string };
  'room:update': Partial<Room>;
  'sync:event': SyncEvent;
  'sync:request': { roomId: string };
  'sync:ping': { clientTime: number };
  'sync:pong': { clientTime: number; serverTime: number };
  'sync:takeover': { roomId: string };
  'sync:lock': { enabled: boolean };
  'chat:message': { roomId: string; content: string; type?: Message['type'] };
  'chat:typing': { roomId: string; isTyping: boolean };
  'chat:reaction': { messageId: string; emoji: string };
  'presence:update': PresenceEvent;
  'friend:request': { friendId: string };
  'friend:accept': { requestId: string };
  'voice:join': { roomId: string };
  'voice:leave': { roomId: string };
  'voice:toggle_mute': { muted: boolean };
  'reaction:add': { roomId: string; timestampSec: number; type: string; content?: string };
  'skip:intro_vote': { roomId: string; vote: boolean };
  'skip:intro_skip': { roomId: string; timestamp: number };
  'anime:set_episode': { roomId: string; mediaId: number; episode: number };
  'anime:search': { query: string };
  'room:kick': { roomId: string; userId: string };
  'room:ban': { roomId: string; userId: string };
};

export interface ServerToClientEvents {
  'room:state': (room: Room & { members: RoomMember[] }) => void;
  'room:user_joined': (user: User) => void;
  'room:user_left': (userId: string) => void;
  'sync:event': (event: SyncEvent) => void;
  'sync:state': (state: { timestamp: number; playback_state: string; speed: number; episode: string | null; episode_number: number | null }) => void;
  'sync:ping': (data: { serverTime: number }) => void;
  'sync:pong': (data: { clientTime: number; serverTime: number; rtt: number }) => void;
  'sync:takeover': (data: { newHostId: string; timestamp: number }) => void;
  'sync:drift_update': (data: { userId: string; drift: number; status: 'synced' | 'slight' | 'desynced' }) => void;
  'chat:message': (message: Message & { sender: User }) => void;
  'chat:typing': (data: { userId: string; isTyping: boolean }) => void;
  'chat:reaction': (message: Message & { sender: User }) => void;
  'presence:update': (event: PresenceEvent & { user: User }) => void;
  'voice:participant_update': (participant: VoiceParticipant) => void;
  'reaction:new': (reaction: any) => void;
  'skip:intro_vote_update': (data: { votes: number; needed: number }) => void;
  'skip:intro_skipping': (data: { countdown: number; targetTimestamp: number }) => void;
  'room:kick': (data: { reason?: string }) => void;
  'room:banned': (data: { reason?: string }) => void;
  'room:new_host': (data: { newHostId: string }) => void;
  'error:rate_limit': (data: { event: string; retryAfter: number }) => void;
  'error': (error: { code: string; message: string }) => void;
}

export interface ClientToServerEvents extends SocketEventMap {}
