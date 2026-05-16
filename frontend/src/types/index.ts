export interface User {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  created_at: string
}

export interface Room {
  id: string
  name: string
  description: string | null
  media_url: string | null
  media_title: string | null
  episode: number | null
  is_public: boolean
  host_id: string
  host: User
  participant_count: number
  created_at: string
}

export interface SyncEvent {
  id: string
  room_id: string
  user_id: string
  event_type: 'play' | 'pause' | 'seek' | 'rate_change' | 'sync_correction'
  timestamp: number
  media_timestamp: number
  playback_rate: number
  confidence: number
  method: SyncMethod
  scene_id: string | null
  created_at: string
}

export type SyncMethod = 'direct' | 'audio_fingerprint' | 'visual' | 'subtitle' | 'playback_prediction'

export interface SyncState {
  room_id: string
  media_timestamp: number
  playback_rate: number
  is_playing: boolean
  last_sync_at: string
  confidence: number
  active_method: SyncMethod
}

export interface DetectionResult {
  matched: boolean
  timestamp: number
  confidence: number
  method: SyncMethod
  scene_id: string | null
  drift_seconds: number
}

export interface SceneInfo {
  id: string
  episode: number
  scene_number: number
  start_time: number
  end_time: number
  fingerprint_hash: string | null
  thumbnail_url: string | null
}

export interface Clip {
  id: string
  room_id: string
  user_id: string
  scene_id: string | null
  start_time: number
  end_time: number
  title: string
  created_at: string
}

export interface Reaction {
  id: string
  room_id: string
  user_id: string
  scene_id: string | null
  emoji: string
  timestamp: number
  created_at: string
  user: User
}

export interface ActivityEvent {
  id: string
  type: 'room_created' | 'user_joined' | 'reaction' | 'clip_created' | 'watch_started'
  user_id: string
  room_id: string
  metadata: Record<string, unknown>
  created_at: string
  user: User
}

export interface WSMessage {
  type: string
  payload: Record<string, unknown>
  timestamp: string
}

export interface AuthTokens {
  access_token: string
  token_type: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
}
