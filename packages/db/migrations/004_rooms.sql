-- SyncSaga Migration 004: Rooms
-- Requires: 002_base_schema.sql
-- Idempotent: YES (all IF NOT EXISTS)

-- ============================================
-- ROOMS
-- ============================================
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
    playback_position FLOAT DEFAULT 0,
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

-- ============================================
-- ROOM MEMBERS
-- ============================================
CREATE TABLE IF NOT EXISTS public.room_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('host', 'co_host', 'member')),
    is_banned BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- ============================================
-- ROOM INVITES
-- ============================================
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

-- ============================================
-- EMBED CONFIGURATIONS
-- ============================================
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

-- ============================================
-- ROOMS TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;
CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
