-- SyncSaga Migration 006: Reactions & Clips
-- Requires: 004_rooms.sql, 005_social.sql
-- Idempotent: YES (all IF NOT EXISTS)

-- ============================================
-- TIMELINE REACTIONS (timestamp-anchored)
-- ============================================
CREATE TABLE IF NOT EXISTS public.timeline_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    timestamp_sec FLOAT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('laugh', 'cry', 'shock', 'fire', 'heart', 'gg', 'voice', 'text', 'clap', 'pepe')),
    content TEXT,
    voice_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CLIPS (saved moments)
-- ============================================
CREATE TABLE IF NOT EXISTS public.clips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    anime_title TEXT NOT NULL,
    episode_number INTEGER,
    start_time FLOAT NOT NULL,
    end_time FLOAT NOT NULL,
    title TEXT,
    description TEXT,
    thumbnail_url TEXT,
    source_url TEXT,
    view_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WATCH EVENTS (replaces old watch_history)
-- ============================================
CREATE TABLE IF NOT EXISTS public.watch_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    anime_id TEXT NOT NULL,
    anime_title TEXT NOT NULL,
    episode_number INTEGER NOT NULL,
    episode_title TEXT,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    friends_in_room UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SCHEDULED ROOMS
-- ============================================
CREATE TABLE IF NOT EXISTS public.scheduled_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    anime_title TEXT NOT NULL,
    episode INTEGER,
    scheduled_at TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE DEFAULT uuid_generate_v4(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER ACHIEVEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- ============================================
-- EPISODE FINGERPRINTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.episode_fingerprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anime_id UUID NOT NULL REFERENCES public.anime_metadata(id) ON DELETE CASCADE,
    episode_number INT NOT NULL,
    duration_seconds FLOAT NOT NULL,
    fingerprint_count INT DEFAULT 0,
    op_start FLOAT,
    op_end FLOAT,
    ed_start FLOAT,
    ed_end FLOAT,
    fingerprint_data BYTEA,
    hash_index INT[] DEFAULT '{}',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(anime_id, episode_number)
);
