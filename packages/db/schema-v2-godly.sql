-- SyncSaga Schema v2 — Godly Features
-- Run after schema.sql

-- ============================================
-- TIMESTAMP-ANCHORED REACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.timeline_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    timestamp_sec FLOAT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('laugh', 'cry', 'shock', 'fire', 'heart', 'gg', 'voice', 'text')),
    content TEXT,
    voice_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timeline_reactions_room ON public.timeline_reactions(room_id, timestamp_sec);

-- ============================================
-- CLIP MOMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.clips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    anime_title TEXT NOT NULL,
    episode_number INT,
    start_time FLOAT NOT NULL,
    end_time FLOAT NOT NULL,
    title TEXT,
    description TEXT,
    thumbnail_url TEXT,
    source_url TEXT,
    view_count INT DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clips_user ON public.clips(user_id, created_at DESC);
CREATE INDEX idx_clips_anime ON public.clips(anime_title, episode_number);

-- ============================================
-- WATCH HISTORY / TASTE GRAPH
-- ============================================
CREATE TABLE IF NOT EXISTS public.watch_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    anime_id TEXT NOT NULL,
    anime_title TEXT NOT NULL,
    episode_number INT NOT NULL,
    episode_title TEXT,
    duration_seconds INT NOT NULL DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    friends_in_room UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_watch_events_user ON public.watch_events(user_id, created_at DESC);
CREATE INDEX idx_watch_events_anime ON public.watch_events(anime_id, episode_number);
CREATE INDEX idx_watch_events_completed ON public.watch_events(anime_id) WHERE completed = true;

-- ============================================
-- FRIENDS ACTIVITY FEED
-- ============================================
CREATE TABLE IF NOT EXISTS public.activity_feed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'watching', 'completed', 'rated', 'clip_created',
        'joined_room', 'created_room', 'friend_added',
        'reaction', 'achievement'
    )),
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_feed_user ON public.activity_feed(user_id, created_at DESC);
CREATE INDEX idx_activity_feed_friends ON public.activity_feed(created_at DESC)
    WHERE type IN ('watching', 'completed', 'rated', 'clip_created', 'joined_room');

-- ============================================
-- AI FINGERPRINT DATABASE
-- ============================================
CREATE TABLE IF NOT EXISTS public.anime_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    title_english TEXT,
    title_japanese TEXT,
    mal_id INT UNIQUE,
    anilist_id INT UNIQUE,
    episodes INT,
    genres TEXT[] DEFAULT '{}',
    studio TEXT,
    year INT,
    cover_url TEXT,
    fingerprint_status TEXT DEFAULT 'pending' CHECK (fingerprint_status IN ('pending', 'processing', 'ready', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_anime_metadata_title ON public.anime_metadata USING gin(to_tsvector('english', title));

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

CREATE INDEX idx_fingerprints_hash ON public.episode_fingerprints USING gin(hash_index);

-- ============================================
-- WATCH PARTY API KEYS
-- ============================================
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    permissions TEXT[] DEFAULT '{read}',
    rate_limit INT DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- ============================================
-- EMBED CONFIGURATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.embed_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'dark',
    features TEXT[] DEFAULT '{chat,voice,sync}',
    allowed_origins TEXT[] DEFAULT '*',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id)
);

-- ============================================
-- ACHIEVEMENTS / BADGES
-- ============================================
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    category TEXT NOT NULL CHECK (category IN ('watching', 'social', 'milestone', 'special'))
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- ============================================
-- UPDATED INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_timeline_reactions_lookup ON public.timeline_reactions(room_id, timestamp_sec);
CREATE INDEX IF NOT EXISTS idx_activity_feed_lookup ON public.activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_events_taste ON public.watch_events(user_id, anime_id);
