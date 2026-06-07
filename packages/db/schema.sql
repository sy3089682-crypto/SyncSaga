-- SyncSaga Database Schema v2 - Unified with AI Fingerprinting Support
-- Compatible with PostgreSQL 15+

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users table (managed by Supabase Auth, extended with profile data)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    bio TEXT,
    status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away', 'watching')),
    custom_status TEXT,
    theme_preference TEXT DEFAULT 'dark',
    accent_color TEXT DEFAULT '#8b5cf6',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friendships
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id)
);

-- Blocked users
CREATE TABLE IF NOT EXISTS public.blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- Rooms
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    banner_url TEXT,
    background_url TEXT,
    is_private BOOLEAN DEFAULT false,
    password_hash TEXT,
    max_users INTEGER DEFAULT 10,
    host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    co_hosts UUID[] DEFAULT '{}',
    current_episode TEXT,
    current_timestamp FLOAT DEFAULT 0,
    playback_state TEXT DEFAULT 'paused' CHECK (playback_state IN ('playing', 'paused', 'buffering')),
    playback_speed FLOAT DEFAULT 1.0,
    allow_guests BOOLEAN DEFAULT true,
    chat_enabled BOOLEAN DEFAULT true,
    voice_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room members
CREATE TABLE IF NOT EXISTS public.room_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('host', 'co_host', 'member')),
    is_banned BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- Messages (room chat + DM)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'gif', 'reaction', 'system')),
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('friend_request', 'room_invite', 'mention', 'system')),
    title TEXT NOT NULL,
    body TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room invites
CREATE TABLE IF NOT EXISTS public.room_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invitee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE,
    expires_at TIMESTAMPTZ,
    uses_left INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watch history
CREATE TABLE IF NOT EXISTS public.watch_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    anime_title TEXT NOT NULL,
    episode_title TEXT,
    episode_number INTEGER,
    source_url TEXT,
    timestamp FLOAT DEFAULT 0,
    duration FLOAT,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
    moderator_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Anime metadata (for AI fingerprinting)
CREATE TABLE IF NOT EXISTS public.anime_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anilist_id INTEGER UNIQUE,
    mal_id INTEGER UNIQUE,
    title_romaji TEXT NOT NULL,
    title_english TEXT,
    title_native TEXT,
    cover_image TEXT,
    banner_image TEXT,
    description TEXT,
    episodes INTEGER,
    status TEXT CHECK (status IN ('airing', 'finished', 'not-yet-aired', 'cancelled')),
    season TEXT,
    season_year INTEGER,
    genres TEXT[] DEFAULT '{}',
    average_score FLOAT,
    popularity INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Episode fingerprints for audio matching
CREATE TABLE IF NOT EXISTS public.episode_fingerprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anime_id UUID NOT NULL REFERENCES public.anime_metadata(id) ON DELETE CASCADE,
    episode_number INTEGER NOT NULL,
    duration_seconds FLOAT,
    fingerprint_count INTEGER DEFAULT 0,
    hash_index INTEGER[] DEFAULT '{}',
    op_start FLOAT,
    op_end FLOAT,
    ed_start FLOAT,
    ed_end FLOAT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(anime_id, episode_number)
);

-- Fingerprint landmarks (individual spectral peaks)
CREATE TABLE IF NOT EXISTS public.fingerprint_landmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    episode_id UUID NOT NULL REFERENCES public.episode_fingerprints(id) ON DELETE CASCADE,
    offset_ms INTEGER NOT NULL,
    hash_value BIGINT NOT NULL,
    freq1 INTEGER,
    freq2 INTEGER,
    delta_time INTEGER,
    confidence FLOAT DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scene boundaries and metadata
CREATE TABLE IF NOT EXISTS public.scenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anime_id UUID NOT NULL REFERENCES public.anime_metadata(id) ON DELETE CASCADE,
    episode_number INTEGER NOT NULL,
    scene_number INTEGER NOT NULL,
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(anime_id, episode_number, scene_number)
);

-- Skip intro votes
CREATE TABLE IF NOT EXISTS public.skip_intro_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    episode_id UUID REFERENCES public.episode_fingerprints(id) ON DELETE SET NULL,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('skip', 'keep')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id, episode_id)
);

-- Achievements and badges
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    category TEXT CHECK (category IN ('watching', 'social', 'special', 'premium')),
    points INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Watch events for taste graph
CREATE TABLE IF NOT EXISTS public.watch_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    anime_id UUID REFERENCES public.anime_metadata(id) ON DELETE SET NULL,
    episode_number INTEGER,
    event_type TEXT NOT NULL CHECK (event_type IN ('start', 'complete', 'drop', 'pause', 'resume')),
    progress_seconds FLOAT DEFAULT 0,
    duration_seconds FLOAT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 10),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Embed configurations
CREATE TABLE IF NOT EXISTS public.embed_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    domain_whitelist TEXT[] DEFAULT '{}',
    theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'custom')),
    custom_css TEXT,
    show_chat BOOLEAN DEFAULT true,
    show_reactions BOOLEAN DEFAULT true,
    autoplay BOOLEAN DEFAULT false,
    api_key TEXT UNIQUE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- Analytics events
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    sync_drift_ms FLOAT,
    latency_ms FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_room_members_room ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON public.room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_room ON public.messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_watch_history_user ON public.watch_history(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_presence_status ON public.profiles(status);

-- AI/Anime indexes
CREATE INDEX IF NOT EXISTS idx_anime_anilist ON public.anime_metadata(anilist_id);
CREATE INDEX IF NOT EXISTS idx_anime_mal ON public.anime_metadata(mal_id);
CREATE INDEX IF NOT EXISTS idx_anime_title ON public.anime_metadata(title_romaji);
CREATE INDEX IF NOT EXISTS idx_episodes_anime ON public.episode_fingerprints(anime_id);
CREATE INDEX IF NOT EXISTS idx_episodes_status ON public.episode_fingerprints(status);
CREATE INDEX IF NOT EXISTS idx_landmarks_hash ON public.fingerprint_landmarks(hash_value);
CREATE INDEX IF NOT EXISTS idx_landmarks_episode ON public.fingerprint_landmarks(episode_id);
CREATE INDEX IF NOT EXISTS idx_scenes_anime ON public.scenes(anime_id, episode_number);
CREATE INDEX IF NOT EXISTS idx_scenes_fingerprint ON public.scenes(audio_fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_watch_events_user ON public.watch_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_watch_events_anime ON public.watch_events(anime_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON public.analytics_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_skip_votes_room ON public.skip_intro_votes(room_id, episode_id);

-- Row Level Security (RLS) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles: read public, update own
CREATE POLICY "Profiles are viewable by everyone"
    ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Friendships: view if involved
CREATE POLICY "Friendships viewable by participants"
    ON public.friendships FOR SELECT USING (
        auth.uid() = requester_id OR auth.uid() = addressee_id
    );

-- Rooms: public viewable, private by member
CREATE POLICY "Public rooms are viewable"
    ON public.rooms FOR SELECT USING (is_private = false);

CREATE POLICY "Private rooms viewable by members"
    ON public.rooms FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.room_members
            WHERE room_id = rooms.id AND user_id = auth.uid()
        )
    );

-- Messages: viewable in joined rooms or DMs
CREATE POLICY "Messages viewable in joined rooms"
    ON public.messages FOR SELECT USING (
        room_id IS NULL OR EXISTS (
            SELECT 1 FROM public.room_members
            WHERE room_id = messages.room_id AND user_id = auth.uid()
        )
    );

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_anime_metadata_updated_at BEFORE UPDATE ON public.anime_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_episode_fingerprints_updated_at BEFORE UPDATE ON public.episode_fingerprints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-award achievement function
CREATE OR REPLACE FUNCTION award_achievement(p_user_id UUID, p_achievement_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_achievement_id UUID;
    v_already_awarded BOOLEAN;
BEGIN
    -- Get achievement ID
    SELECT id INTO v_achievement_id FROM public.achievements WHERE name = p_achievement_name;
    
    IF v_achievement_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if already awarded
    SELECT EXISTS(SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_id = v_achievement_id)
    INTO v_already_awarded;
    
    IF v_already_awarded THEN
        RETURN FALSE;
    END IF;
    
    -- Award achievement
    INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (p_user_id, v_achievement_id);
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Update skip vote counts trigger
CREATE OR REPLACE FUNCTION update_skip_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify room about skip vote change via notification table or could use pg_notify for real-time
    PERFORM pg_notify('skip_vote_changed', json_build_object(
        'room_id', NEW.room_id,
        'episode_id', NEW.episode_id,
        'vote_type', NEW.vote_type,
        'user_id', NEW.user_id
    )::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_skip_vote_changed
    AFTER INSERT OR UPDATE OR DELETE ON public.skip_intro_votes
    FOR EACH ROW EXECUTE FUNCTION update_skip_vote_counts();

-- Analytics event logging function
CREATE OR REPLACE FUNCTION log_analytics_event(
    p_event_type TEXT,
    p_user_id UUID DEFAULT NULL,
    p_room_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_sync_drift_ms FLOAT DEFAULT NULL,
    p_latency_ms FLOAT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO public.analytics_events (event_type, user_id, room_id, metadata, sync_drift_ms, latency_ms)
    VALUES (p_event_type, p_user_id, p_room_id, p_metadata, p_sync_drift_ms, p_latency_ms)
    RETURNING id INTO v_event_id;
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Taste graph recommendation score calculation
CREATE OR REPLACE FUNCTION calculate_user_affinity(p_user_id UUID, p_target_anime_id UUID)
RETURNS FLOAT AS $$
DECLARE
    v_score FLOAT := 0.0;
    v_similar_users_count INTEGER;
BEGIN
    -- Find users who watched both the target anime and other anime the user watched
    SELECT COUNT(DISTINCT we2.user_id) INTO v_similar_users_count
    FROM public.watch_events we1
    JOIN public.watch_events we2 ON we1.anime_id = we2.anime_id AND we1.user_id != we2.user_id
    WHERE we1.user_id = p_user_id
    AND we2.user_id IN (
        SELECT user_id FROM public.watch_events WHERE anime_id = p_target_anime_id
    );
    
    -- Normalize score (simple implementation)
    IF v_similar_users_count > 0 THEN
        v_score := LEAST(1.0, v_similar_users_count / 10.0);
    END IF;
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Default achievements seed data
INSERT INTO public.achievements (name, description, icon_url, category, points) VALUES
    ('first_watch', 'Watch your first episode in a room', '/badges/first_watch.svg', 'watching', 10),
    ('night_owl', 'Watch after midnight', '/badges/night_owl.svg', 'watching', 15),
    ('binge_watcher', 'Watch 10 episodes in one day', '/badges/binge_watcher.svg', 'watching', 50),
    ('social_butterfly', 'Add 10 friends', '/badges/social_butterfly.svg', 'social', 30),
    ('host_supreme', 'Host 20 watch parties', '/badges/host_supreme.svg', 'social', 75),
    ('early_adopter', 'Join during beta', '/badges/early_adopter.svg', 'special', 100),
    ('premium_supporter', 'Subscribe to premium', '/badges/premium_supporter.svg', 'premium', 50),
    ('sync_master', 'Maintain 99% sync accuracy for 5 sessions', '/badges/sync_master.svg', 'watching', 40),
    ('recommendation_guru', 'Get 50 recommendations accepted', '/badges/recommendation_guru.svg', 'social', 60),
    ('marathon_runner', 'Watch a full season in one week', '/badges/marathon_runner.svg', 'watching', 80)
ON CONFLICT (name) DO NOTHING;
