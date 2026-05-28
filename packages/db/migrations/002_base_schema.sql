-- SyncSaga Migration 002: Base Schema
-- Requires: 001_extensions.sql
-- Idempotent: YES (all IF NOT EXISTS)

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
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

-- ============================================
-- BLOCKED USERS
-- ============================================
CREATE TABLE IF NOT EXISTS public.blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- ============================================
-- ACHIEVEMENTS CATALOG
-- ============================================
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    category TEXT NOT NULL CHECK (category IN ('watching', 'social', 'milestone', 'special'))
);

-- ============================================
-- ANIME METADATA (AI fingerprint database)
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

-- ============================================
-- BANS (global)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT,
    banned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROFILES TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
