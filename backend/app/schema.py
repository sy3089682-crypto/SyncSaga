"""SyncSaga v2 Database Schema — pgvector enabled"""

SCHEMA_SQL = """
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ─── Users & Profiles ───
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    status TEXT DEFAULT 'offline'
        CHECK (status IN ('online', 'offline', 'away', 'watching')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Rooms ───
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT false,
    max_users INT DEFAULT 10,
    host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    co_hosts UUID[] DEFAULT '{}',
    current_episode TEXT,
    current_scene_id UUID,
    playback_state TEXT DEFAULT 'paused'
        CHECK (playback_state IN ('playing', 'paused', 'buffering')),
    playback_speed FLOAT DEFAULT 1.0,
    sync_confidence FLOAT DEFAULT 1.0,
    sync_mode TEXT DEFAULT 'auto'
        CHECK (sync_mode IN ('auto', 'manual', 'extension_only')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Room Members ───
CREATE TABLE IF NOT EXISTS room_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member'
        CHECK (role IN ('host', 'co_host', 'member')),
    is_banned BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- ─── Messages ───
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text'
        CHECK (type IN ('text', 'gif', 'reaction', 'system', 'scene_comment')),
    scene_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Scehe Intelligence ───
CREATE TABLE IF NOT EXISTS scenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anime_id TEXT NOT NULL,
    episode_number INT NOT NULL,
    scene_number INT NOT NULL,
    start_time FLOAT NOT NULL,
    end_time FLOAT NOT NULL,
    duration FLOAT NOT NULL,
    title TEXT,
    description TEXT,
    emotion_tags TEXT[] DEFAULT '{}',
    action_intensity FLOAT DEFAULT 0.0,
    has_opening BOOLEAN DEFAULT false,
    has_ending BOOLEAN DEFAULT false,
    audio_fingerprint_hash TEXT,
    subtitle_text TEXT,
    visual_embedding vector(512),
    subtitle_embedding vector(384),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scenes_anime ON scenes(anime_id, episode_number);
CREATE INDEX idx_scenes_fingerprint ON scenes(audio_fingerprint_hash);

-- ─── Anime Episodes (Fingerprint Cache) ───
CREATE TABLE IF NOT EXISTS anime_episodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anilist_id INT,
    title TEXT NOT NULL,
    episode_number INT NOT NULL,
    duration_seconds FLOAT,
    fingerprint_status TEXT DEFAULT 'pending'
        CHECK (fingerprint_status IN ('pending', 'processing', 'ready', 'failed')),
    fingerprint_count INT DEFAULT 0,
    audio_fingerprints JSONB DEFAULT '{}',
    scene_count INT DEFAULT 0,
    op_start FLOAT,
    op_end FLOAT,
    ed_start FLOAT,
    ed_end FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(anilist_id, episode_number)
);

CREATE INDEX idx_episodes_anilist ON anime_episodes(anilist_id);

-- ─── Fingerprint Landmarks ───
CREATE TABLE IF NOT EXISTS fingerprint_landmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    episode_id UUID NOT NULL REFERENCES anime_episodes(id) ON DELETE CASCADE,
    offset_ms INT NOT NULL,
    hash BIGINT NOT NULL,
    freq1 INT,
    freq2 INT,
    delta_time INT,
    confidence FLOAT DEFAULT 1.0
);

CREATE INDEX idx_landmarks_hash ON fingerprint_landmarks(hash);
CREATE INDEX idx_landmarks_episode ON fingerprint_landmarks(episode_id);

-- ─── Sync Events Log ───
CREATE TABLE IF NOT EXISTS sync_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB,
    server_timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Timeline Reactions (Scene-attached) ───
CREATE TABLE IF NOT EXISTS scene_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    emoji TEXT NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Clips ───
CREATE TABLE IF NOT EXISTS clips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    scene_id UUID REFERENCES scenes(id) ON DELETE SET NULL,
    anime_title TEXT NOT NULL,
    episode_number INT,
    start_time FLOAT NOT NULL,
    end_time FLOAT NOT NULL,
    title TEXT,
    view_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Activity Feed ───
CREATE TABLE IF NOT EXISTS activity_feed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_feed_ts ON activity_feed(created_at DESC);

-- ─── Auth ───
CREATE TABLE IF NOT EXISTS auth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Upsert helper ───
CREATE OR REPLACE FUNCTION upsert_scene(
    p_anime_id TEXT, p_episode INT, p_scene_number INT,
    p_start FLOAT, p_end FLOAT
) RETURNS UUID AS $$
DECLARE
    scene_id UUID;
BEGIN
    INSERT INTO scenes (anime_id, episode_number, scene_number, start_time, end_time, duration)
    VALUES (p_anime_id, p_episode, p_scene_number, p_start, p_end, p_end - p_start)
    ON CONFLICT (anime_id, episode_number, scene_number)
    DO UPDATE SET start_time = p_start, end_time = p_end, duration = p_end - p_start
    RETURNING id INTO scene_id;
    RETURN scene_id;
END;
$$ LANGUAGE plpgsql;
"""


def get_schema() -> str:
    return SCHEMA_SQL
