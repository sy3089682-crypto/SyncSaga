-- SyncSaga Database Schema — Master
-- PostgreSQL 15+ / Supabase compatible
-- Run this single file on a fresh Supabase project for zero-error deployment.
-- All statements are idempotent (IF NOT EXISTS / IF EXISTS / OR REPLACE).

-- ==============================================================================
-- PART 1: EXTENSIONS & HELPERS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION array_append_unique(arr anyarray, element anyelement)
RETURNS anyarray AS $$
BEGIN
    IF element IS NULL THEN
        RETURN arr;
    END IF;
    IF array_position(arr, element) IS NULL THEN
        RETURN array_append(arr, element);
    END IF;
    RETURN arr;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END
$$;

-- ==============================================================================
-- PART 2: BASE TABLES
-- ==============================================================================

-- PROFILES (extends Supabase auth.users)
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

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- BLOCKED USERS
CREATE TABLE IF NOT EXISTS public.blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- ACHIEVEMENTS CATALOG
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    category TEXT NOT NULL CHECK (category IN ('watching', 'social', 'milestone', 'special'))
);

-- ANIME METADATA
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

-- BANS (global)
CREATE TABLE IF NOT EXISTS public.bans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT,
    banned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- PART 3: AUTH & SECURITY
-- ==============================================================================

-- API KEYS
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

-- WEBHOOKS
CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    events TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_webhooks_updated_at ON public.webhooks;
CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON public.webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- REPORTS
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    room_id UUID,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
    moderator_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- ==============================================================================
-- PART 4: ROOMS
-- ==============================================================================

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
    current_episode_number INTEGER,
    current_timestamp FLOAT DEFAULT 0,
    playback_state TEXT DEFAULT 'paused' CHECK (playback_state IN ('playing', 'paused', 'buffering')),
    playback_speed FLOAT DEFAULT 1.0,
    anime_title TEXT,
    anime_media_id INTEGER,
    anime_cover_url TEXT,
    anime_episode_count INTEGER,
    sync_lock BOOLEAN DEFAULT false,
    allow_soundboard BOOLEAN DEFAULT true,
    allow_reactions BOOLEAN DEFAULT true,
    banned_users UUID[] DEFAULT '{}',
    allow_guests BOOLEAN DEFAULT true,
    chat_enabled BOOLEAN DEFAULT true,
    voice_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;
CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ROOM MEMBERS
CREATE TABLE IF NOT EXISTS public.room_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('host', 'co_host', 'member')),
    is_banned BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- ROOM INVITES
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

-- EMBED CONFIGURATIONS
CREATE TABLE IF NOT EXISTS public.embed_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'dark',
    features TEXT[] DEFAULT '{chat,voice,sync}',
    allowed_origins TEXT[] DEFAULT '{*}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id)
);

-- ==============================================================================
-- PART 5: SOCIAL FEATURES
-- ==============================================================================

-- FRIENDSHIPS
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id)
);

DROP TRIGGER IF EXISTS update_friendships_updated_at ON public.friendships;
CREATE TRIGGER update_friendships_updated_at
    BEFORE UPDATE ON public.friendships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- MESSAGES
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

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- MESSAGE REACTIONS
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- NOTIFICATIONS
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

-- DM CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    participant2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(participant1_id, participant2_id)
);

-- ACTIVITY FEED
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

-- ==============================================================================
-- PART 6: REACTIONS & CLIPS
-- ==============================================================================

-- TIMELINE REACTIONS
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

-- CLIPS
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

-- WATCH EVENTS
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

-- SCHEDULED ROOMS
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

-- USER ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- EPISODE FINGERPRINTS
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

-- ==============================================================================
-- PART 7: ANALYTICS & TELEMETRY
-- ==============================================================================

-- SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'pro')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'incomplete')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRESENCE LOG
CREATE TABLE IF NOT EXISTS public.presence_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ANALYTICS EVENTS
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event TEXT NOT NULL,
    properties JSONB DEFAULT '{}',
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROOM METRICS
CREATE TABLE IF NOT EXISTS public.room_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    peak_members INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    total_reactions INTEGER DEFAULT 0,
    total_clips INTEGER DEFAULT 0,
    duration_minutes INTEGER DEFAULT 0,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, date)
);

-- EXTENSION TELEMETRY
CREATE TABLE IF NOT EXISTS public.extension_telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    extension_version TEXT,
    browser TEXT,
    os TEXT,
    video_detected BOOLEAN,
    sync_latency_ms INTEGER,
    errors JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- PART 8: ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embed_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- PROFILES
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- BLOCKED USERS
DROP POLICY IF EXISTS "Users can manage own blocks" ON public.blocked_users;
CREATE POLICY "Users can manage own blocks" ON public.blocked_users FOR ALL USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can see if they are blocked" ON public.blocked_users;
CREATE POLICY "Users can see if they are blocked" ON public.blocked_users FOR SELECT USING (auth.uid() = blocked_id);

-- BANS
DROP POLICY IF EXISTS "Bans manageable by admins" ON public.bans;
CREATE POLICY "Bans manageable by admins" ON public.bans FOR ALL USING (auth.uid() = banned_by);

-- WEBHOOKS
DROP POLICY IF EXISTS "Users can manage own webhooks" ON public.webhooks;
CREATE POLICY "Users can manage own webhooks" ON public.webhooks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- API KEYS
DROP POLICY IF EXISTS "Users can manage own API keys" ON public.api_keys;
CREATE POLICY "Users can manage own API keys" ON public.api_keys FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- REPORTS
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can see own reports" ON public.reports;
CREATE POLICY "Users can see own reports" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);

-- ROOMS
DROP POLICY IF EXISTS "Public rooms are viewable" ON public.rooms;
CREATE POLICY "Public rooms are viewable" ON public.rooms FOR SELECT USING (is_private = false);

DROP POLICY IF EXISTS "Private rooms viewable by members" ON public.rooms;
CREATE POLICY "Private rooms viewable by members" ON public.rooms FOR SELECT USING (
    is_private = true AND EXISTS (SELECT 1 FROM public.room_members WHERE room_id = rooms.id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can create rooms" ON public.rooms;
CREATE POLICY "Users can create rooms" ON public.rooms FOR INSERT WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Host can update own room" ON public.rooms;
CREATE POLICY "Host can update own room" ON public.rooms FOR UPDATE USING (auth.uid() = host_id);

-- ROOM MEMBERS
DROP POLICY IF EXISTS "Members viewable by room members" ON public.room_members;
CREATE POLICY "Members viewable by room members" ON public.room_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.room_members rm WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can join rooms" ON public.room_members;
CREATE POLICY "Users can join rooms" ON public.room_members FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave rooms" ON public.room_members;
CREATE POLICY "Users can leave rooms" ON public.room_members FOR DELETE USING (auth.uid() = user_id);

-- ROOM INVITES
DROP POLICY IF EXISTS "Invites viewable by participants" ON public.room_invites;
CREATE POLICY "Invites viewable by participants" ON public.room_invites FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

DROP POLICY IF EXISTS "Members can create invites" ON public.room_invites;
CREATE POLICY "Members can create invites" ON public.room_invites FOR INSERT WITH CHECK (auth.uid() = inviter_id);

-- EMBED CONFIGS
DROP POLICY IF EXISTS "Users can manage own embed configs" ON public.embed_configs;
CREATE POLICY "Users can manage own embed configs" ON public.embed_configs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- FRIENDSHIPS
DROP POLICY IF EXISTS "Friendships viewable by participants" ON public.friendships;
CREATE POLICY "Friendships viewable by participants" ON public.friendships FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
CREATE POLICY "Users can send friend requests" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can update own friendships" ON public.friendships;
CREATE POLICY "Users can update own friendships" ON public.friendships FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- MESSAGES
DROP POLICY IF EXISTS "Messages viewable in joined rooms or DMs" ON public.messages;
CREATE POLICY "Messages viewable in joined rooms or DMs" ON public.messages FOR SELECT USING (
    room_id IS NULL
    OR EXISTS (SELECT 1 FROM public.room_members WHERE room_id = messages.room_id AND user_id = auth.uid())
    OR auth.uid() = recipient_id
    OR auth.uid() = sender_id
);

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- MESSAGE REACTIONS
DROP POLICY IF EXISTS "Users can manage own message reactions" ON public.message_reactions;
CREATE POLICY "Users can manage own message reactions" ON public.message_reactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Message reactions viewable by participants" ON public.message_reactions;
CREATE POLICY "Message reactions viewable by participants" ON public.message_reactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.messages m LEFT JOIN public.room_members rm ON rm.room_id = m.room_id AND rm.user_id = auth.uid() WHERE m.id = message_reactions.message_id AND (m.room_id IS NULL OR rm.user_id IS NOT NULL OR m.sender_id = auth.uid() OR m.recipient_id = auth.uid()))
);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- CONVERSATIONS
DROP POLICY IF EXISTS "Conversations viewable by participants" ON public.conversations;
CREATE POLICY "Conversations viewable by participants" ON public.conversations FOR SELECT USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- ACTIVITY FEED
DROP POLICY IF EXISTS "Activity feed viewable by friends" ON public.activity_feed;
CREATE POLICY "Activity feed viewable by friends" ON public.activity_feed FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.friendships WHERE status = 'accepted' AND ((requester_id = auth.uid() AND addressee_id = activity_feed.user_id) OR (addressee_id = auth.uid() AND requester_id = activity_feed.user_id)))
);

DROP POLICY IF EXISTS "Users can create activity entries" ON public.activity_feed;
CREATE POLICY "Users can create activity entries" ON public.activity_feed FOR INSERT WITH CHECK (auth.uid() = user_id);

-- TIMELINE REACTIONS
DROP POLICY IF EXISTS "Timeline reactions viewable by room members" ON public.timeline_reactions;
CREATE POLICY "Timeline reactions viewable by room members" ON public.timeline_reactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.room_members WHERE room_id = timeline_reactions.room_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can react in joined rooms" ON public.timeline_reactions;
CREATE POLICY "Users can react in joined rooms" ON public.timeline_reactions FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.room_members WHERE room_id = timeline_reactions.room_id AND user_id = auth.uid())
);

-- CLIPS
DROP POLICY IF EXISTS "Public clips viewable" ON public.clips;
CREATE POLICY "Public clips viewable" ON public.clips FOR SELECT USING (is_public = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create clips" ON public.clips;
CREATE POLICY "Users can create clips" ON public.clips FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own clips" ON public.clips;
CREATE POLICY "Users can manage own clips" ON public.clips FOR UPDATE USING (auth.uid() = user_id);

-- WATCH EVENTS
DROP POLICY IF EXISTS "Users can manage own watch events" ON public.watch_events;
CREATE POLICY "Users can manage own watch events" ON public.watch_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SCHEDULED ROOMS
DROP POLICY IF EXISTS "Scheduled rooms viewable" ON public.scheduled_rooms;
CREATE POLICY "Scheduled rooms viewable" ON public.scheduled_rooms FOR SELECT USING (is_active = true OR auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can schedule rooms" ON public.scheduled_rooms;
CREATE POLICY "Users can schedule rooms" ON public.scheduled_rooms FOR INSERT WITH CHECK (auth.uid() = created_by);

-- USER ACHIEVEMENTS
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Achievements viewable by anyone" ON public.achievements;
CREATE POLICY "Achievements viewable by anyone" ON public.achievements FOR SELECT USING (true);

-- ==============================================================================
-- PART 9: INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);
CREATE INDEX IF NOT EXISTS idx_rooms_is_public ON public.rooms(is_private);
CREATE INDEX IF NOT EXISTS idx_rooms_created ON public.rooms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rooms_host ON public.rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_room_members_room ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON public.room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_created ON public.messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON public.conversations(participant1_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON public.conversations(participant2_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_reactions_room ON public.timeline_reactions(room_id, timestamp_sec);
CREATE INDEX IF NOT EXISTS idx_clips_user ON public.clips(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clips_anime ON public.clips(anime_title);
CREATE INDEX IF NOT EXISTS idx_watch_events_user ON public.watch_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_events_anime ON public.watch_events(anime_id, episode_number);
CREATE INDEX IF NOT EXISTS idx_watch_events_completed ON public.watch_events(anime_id) WHERE completed = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_rooms_time ON public.scheduled_rooms(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_bans_user ON public.bans(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON public.activity_feed(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON public.activity_feed(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_presence_log_user ON public.presence_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON public.analytics_events(event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON public.analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_room_metrics_date ON public.room_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_room_metrics_room_date ON public.room_metrics(room_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_extension_telemetry_user ON public.extension_telemetry(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anime_metadata_search ON public.anime_metadata USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_anime_metadata_mal ON public.anime_metadata(mal_id);
CREATE INDEX IF NOT EXISTS idx_anime_metadata_anilist ON public.anime_metadata(anilist_id);
CREATE INDEX IF NOT EXISTS idx_fingerprints_hash ON public.episode_fingerprints USING gin(hash_index);
CREATE INDEX IF NOT EXISTS idx_fingerprints_anime ON public.episode_fingerprints(anime_id, episode_number);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);

-- ==============================================================================
-- PART 10: SUPABASE REALTIME PUBLICATION
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.timeline_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.activity_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.notifications;
