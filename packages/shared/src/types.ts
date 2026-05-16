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
  current_timestamp: number;
  playback_state: 'playing' | 'paused' | 'buffering';
  playback_speed: number;
  created_at: string;
  updated_at: string;
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
  'chat:message': { roomId: string; content: string; type?: Message['type'] };
  'chat:typing': { roomId: string; isTyping: boolean };
  'chat:reaction': { messageId: string; emoji: string };
  'presence:update': PresenceEvent;
  'friend:request': { friendId: string };
  'friend:accept': { requestId: string };
  'voice:join': { roomId: string };
  'voice:leave': { roomId: string };
  'voice:toggle_mute': { muted: boolean };
};

export interface ServerToClientEvents {
  'room:state': (room: Room & { members: RoomMember[] }) => void;
  'room:user_joined': (user: User) => void;
  'room:user_left': (userId: string) => void;
  'sync:event': (event: SyncEvent) => void;
  'sync:state': (state: { timestamp: number; playback_state: string; speed: number; episode: string | null }) => void;
  'chat:message': (message: Message & { sender: User }) => void;
  'chat:typing': (data: { userId: string; isTyping: boolean }) => void;
  'presence:update': (event: PresenceEvent & { user: User }) => void;
  'voice:participant_update': (participant: VoiceParticipant) => void;
  'error': (error: { code: string; message: string }) => void;
}

export interface ClientToServerEvents extends SocketEventMap {}
