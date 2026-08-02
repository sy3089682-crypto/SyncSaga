-- ============================================================
-- SyncSaga — Initial Schema Migration
-- Supabase PostgreSQL with Row Level Security
-- ============================================================
-- This migration creates all tables, indexes, constraints,
-- triggers, and RLS policies for the SyncSaga platform.
-- Run this in the Supabase SQL Editor or via `supabase db push`.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- UTILITY FUNCTIONS
-- ============================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to safely get the authenticated user ID
CREATE OR REPLACE FUNCTION public.auth_uid()
RETURNS UUID AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', ''),
    NULLIF(current_setting('request.jwt.claims', true)::json->>'user_id', '')
  )::UUID;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================
-- PROFILES TABLE
-- Links to auth.users via UUID. One profile per auth user.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT NOT NULL UNIQUE,
  display_name    TEXT,
  avatar_url      TEXT,
  banner_url      TEXT,
  bio             TEXT,
  status          TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('offline', 'online', 'away', 'dnd', 'in_room')),
  custom_status   TEXT,
  theme_preference TEXT NOT NULL DEFAULT 'dark' CHECK (theme_preference IN ('dark', 'light', 'system')),
  accent_color    TEXT NOT NULL DEFAULT '#FF6A5B',
  totp_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  totp_secret     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 32),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$'),
  CONSTRAINT bio_length CHECK (bio IS NULL OR char_length(bio) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

-- Trigger: auto-update updated_at
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger: auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS: Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth_uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth_uid() = id) WITH CHECK (auth_uid() = id);

CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE USING (auth_uid() = id);

-- ============================================================
-- FRIENDSHIPS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.friendships (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_friendships_pair ON public.friendships(
  LEAST(requester_id, addressee_id),
  GREATEST(requester_id, addressee_id)
);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

CREATE TRIGGER trg_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: Friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friendships_select_participants" ON public.friendships
  FOR SELECT USING (auth_uid() = requester_id OR auth_uid() = addressee_id);

CREATE POLICY "friendships_insert_requester" ON public.friendships
  FOR INSERT WITH CHECK (auth_uid() = requester_id);

CREATE POLICY "friendships_update_participants" ON public.friendships
  FOR UPDATE USING (auth_uid() = requester_id OR auth_uid() = addressee_id)
  WITH CHECK (auth_uid() = requester_id OR auth_uid() = addressee_id);

CREATE POLICY "friendships_delete_participants" ON public.friendships
  FOR DELETE USING (auth_uid() = requester_id OR auth_uid() = addressee_id);

-- ============================================================
-- ROOMS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rooms (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  description       TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  banner_url        TEXT,
  is_private        BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash     TEXT,
  max_users         INTEGER NOT NULL DEFAULT 10 CHECK (max_users >= 2 AND max_users <= 100),
  host_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  co_hosts          UUID[] NOT NULL DEFAULT '{}',
  current_episode   TEXT,
  media_id          INTEGER,
  anime_title       TEXT,
  episode_number    INTEGER CHECK (episode_number IS NULL OR episode_number >= 1),
  playback_state    TEXT NOT NULL DEFAULT 'paused' CHECK (playback_state IN ('playing', 'paused', 'buffering')),
  "current_timestamp" DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK ("current_timestamp" >= 0),
  duration          DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (duration >= 0),
  sync_locked       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_host ON public.rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_rooms_private ON public.rooms(is_private);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON public.rooms(created_at DESC);
-- idx_rooms_media is created in 00005 after media_id is guaranteed to exist

CREATE TRIGGER trg_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: Rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Public rooms are visible to everyone; private rooms only to members
CREATE POLICY "rooms_select" ON public.rooms
  FOR SELECT USING (
    is_private = FALSE
    OR host_id = auth_uid()
    OR EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = rooms.id AND user_id = auth_uid() AND is_banned = FALSE
    )
    OR auth_uid() = ANY(co_hosts)
  );

CREATE POLICY "rooms_insert_host" ON public.rooms
  FOR INSERT WITH CHECK (host_id = auth_uid());

CREATE POLICY "rooms_update_host_or_cohost" ON public.rooms
  FOR UPDATE USING (
    host_id = auth_uid()
    OR auth_uid() = ANY(co_hosts)
  )
  WITH CHECK (
    host_id = auth_uid()
    OR auth_uid() = ANY(co_hosts)
  );

CREATE POLICY "rooms_delete_host" ON public.rooms
  FOR DELETE USING (host_id = auth_uid());

-- ============================================================
-- ROOM MEMBERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.room_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id     UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('host', 'co_host', 'member', 'guest')),
  is_banned   BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_room_members_room_user ON public.room_members(room_id, user_id) WHERE is_banned = FALSE;
CREATE INDEX IF NOT EXISTS idx_room_members_room ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON public.room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_room_members_banned ON public.room_members(is_banned);

CREATE TRIGGER trg_room_members_updated_at
  BEFORE UPDATE ON public.room_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: Room Members
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_members_select" ON public.room_members
  FOR SELECT USING (
    user_id = auth_uid()
    OR EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = room_members.room_id
      AND (is_private = FALSE OR host_id = auth_uid() OR auth_uid() = ANY(co_hosts))
    )
    OR EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = room_members.room_id AND rm.user_id = auth_uid()
    )
  );

CREATE POLICY "room_members_insert_self_or_host" ON public.room_members
  FOR INSERT WITH CHECK (
    user_id = auth_uid()
    OR EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = room_members.room_id AND host_id = auth_uid()
    )
  );

CREATE POLICY "room_members_update_host_or_self" ON public.room_members
  FOR UPDATE USING (
    user_id = auth_uid()
    OR EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = room_members.room_id
      AND (host_id = auth_uid() OR auth_uid() = ANY(co_hosts))
    )
  );

CREATE POLICY "room_members_delete_self_or_host" ON public.room_members
  FOR DELETE USING (
    user_id = auth_uid()
    OR EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = room_members.room_id
      AND (host_id = auth_uid() OR auth_uid() = ANY(co_hosts))
    )
  );

-- ============================================================
-- MESSAGES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id       UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content       TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 2000),
  type          TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'system', 'reaction', 'image', 'gif')),
  reply_to_id   UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_pinned     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_room_created ON public.messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_pinned ON public.messages(room_id) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_messages_reply ON public.messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

CREATE TRIGGER trg_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_room_members" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = messages.room_id AND user_id = auth_uid() AND is_banned = FALSE
    )
    OR EXISTS (
      SELECT 1 FROM public.rooms WHERE id = messages.room_id AND host_id = auth_uid()
    )
  );

CREATE POLICY "messages_insert_room_members" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth_uid()
    AND EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = messages.room_id AND user_id = auth_uid() AND is_banned = FALSE
    )
  );

CREATE POLICY "messages_update_own" ON public.messages
  FOR UPDATE USING (sender_id = auth_uid())
  WITH CHECK (sender_id = auth_uid());

CREATE POLICY "messages_delete_own_or_host" ON public.messages
  FOR DELETE USING (
    sender_id = auth_uid()
    OR EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = messages.room_id
      AND (host_id = auth_uid() OR auth_uid() = ANY(co_hosts))
    )
  );

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('friend_request', 'friend_accepted', 'room_invite', 'room_starting', 'clip_shared', 'mention', 'system')),
  title       TEXT NOT NULL CHECK (char_length(title) <= 200),
  body        TEXT,
  data        JSONB NOT NULL DEFAULT '{}',
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- RLS: Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (user_id = auth_uid());

CREATE POLICY "notifications_insert_own" ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth_uid());

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (user_id = auth_uid()) WITH CHECK (user_id = auth_uid());

CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE USING (user_id = auth_uid());

-- ============================================================
-- CLIPS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clips (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id         UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  anime_title     TEXT,
  episode_number  INTEGER CHECK (episode_number IS NULL OR episode_number >= 1),
  start_time      DOUBLE PRECISION NOT NULL CHECK (start_time >= 0),
  end_time        DOUBLE PRECISION NOT NULL CHECK (end_time >= 0),
  duration        DOUBLE PRECISION NOT NULL DEFAULT 0,
  title           TEXT CHECK (title IS NULL OR char_length(title) <= 200),
  description     TEXT CHECK (description IS NULL OR char_length(description) <= 1000),
  thumbnail_url   TEXT,
  video_url       TEXT,
  is_public       BOOLEAN NOT NULL DEFAULT TRUE,
  view_count      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT clip_duration_valid CHECK (end_time >= start_time)
);

CREATE INDEX IF NOT EXISTS idx_clips_user ON public.clips(user_id);
CREATE INDEX IF NOT EXISTS idx_clips_public ON public.clips(is_public, created_at DESC) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_clips_room ON public.clips(room_id) WHERE room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clips_anime ON public.clips(anime_title) WHERE anime_title IS NOT NULL;

CREATE TRIGGER trg_clips_updated_at
  BEFORE UPDATE ON public.clips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: Clips
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clips_select_public_or_own" ON public.clips
  FOR SELECT USING (is_public = TRUE OR user_id = auth_uid());

CREATE POLICY "clips_insert_own" ON public.clips
  FOR INSERT WITH CHECK (user_id = auth_uid());

CREATE POLICY "clips_update_own" ON public.clips
  FOR UPDATE USING (user_id = auth_uid()) WITH CHECK (user_id = auth_uid());

CREATE POLICY "clips_delete_own" ON public.clips
  FOR DELETE USING (user_id = auth_uid());

-- ============================================================
-- TIMELINE REACTIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.timeline_reactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id         UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  timestamp_sec   DOUBLE PRECISION NOT NULL CHECK (timestamp_sec >= 0),
  type            TEXT NOT NULL CHECK (type IN ('emoji', 'text', 'reaction', 'skip_vote')),
  content         TEXT CHECK (content IS NULL OR char_length(content) <= 100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_reactions_room ON public.timeline_reactions(room_id, timestamp_sec);
CREATE INDEX IF NOT EXISTS idx_timeline_reactions_user ON public.timeline_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_reactions_type ON public.timeline_reactions(type);

-- RLS: Timeline Reactions
ALTER TABLE public.timeline_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timeline_reactions_select_room_members" ON public.timeline_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = timeline_reactions.room_id AND user_id = auth_uid() AND is_banned = FALSE
    )
    OR EXISTS (
      SELECT 1 FROM public.rooms WHERE id = timeline_reactions.room_id AND host_id = auth_uid()
    )
  );

CREATE POLICY "timeline_reactions_insert_room_members" ON public.timeline_reactions
  FOR INSERT WITH CHECK (
    user_id = auth_uid()
    AND EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = timeline_reactions.room_id AND user_id = auth_uid() AND is_banned = FALSE
    )
  );

CREATE POLICY "timeline_reactions_delete_own" ON public.timeline_reactions
  FOR DELETE USING (user_id = auth_uid());

-- ============================================================
-- ACTIVITY FEED TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_feed (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('room_joined', 'room_created', 'episode_watched', 'clip_created', 'friend_added', 'achievement_unlocked', 'level_up')),
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON public.activity_feed(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_type ON public.activity_feed(type);

-- RLS: Activity Feed
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_feed_select_own_or_friends" ON public.activity_feed
  FOR SELECT USING (
    user_id = auth_uid()
    OR EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'accepted'
      AND ((requester_id = auth_uid() AND addressee_id = activity_feed.user_id)
        OR (addressee_id = auth_uid() AND requester_id = activity_feed.user_id))
    )
  );

CREATE POLICY "activity_feed_insert_own" ON public.activity_feed
  FOR INSERT WITH CHECK (user_id = auth_uid());

CREATE POLICY "activity_feed_delete_own" ON public.activity_feed
  FOR DELETE USING (user_id = auth_uid());

-- ============================================================
-- WATCH EVENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.watch_events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  anime_id          INTEGER NOT NULL,
  anime_title       TEXT NOT NULL,
  episode_number    INTEGER NOT NULL CHECK (episode_number >= 1),
  episode_title     TEXT,
  duration_seconds  INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  completed         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watch_events_user_anime ON public.watch_events(user_id, anime_id);
CREATE INDEX IF NOT EXISTS idx_watch_events_user_created ON public.watch_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_events_completed ON public.watch_events(user_id) WHERE completed = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_watch_events_user_anime_ep ON public.watch_events(user_id, anime_id, episode_number);

CREATE TRIGGER trg_watch_events_updated_at
  BEFORE UPDATE ON public.watch_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: Watch Events
ALTER TABLE public.watch_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "watch_events_select_own" ON public.watch_events
  FOR SELECT USING (user_id = auth_uid());

CREATE POLICY "watch_events_insert_own" ON public.watch_events
  FOR INSERT WITH CHECK (user_id = auth_uid());

CREATE POLICY "watch_events_update_own" ON public.watch_events
  FOR UPDATE USING (user_id = auth_uid()) WITH CHECK (user_id = auth_uid());

CREATE POLICY "watch_events_delete_own" ON public.watch_events
  FOR DELETE USING (user_id = auth_uid());

-- ============================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  plan                    TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'pro')),
  status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'inactive')),
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: Subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own" ON public.subscriptions
  FOR SELECT USING (user_id = auth_uid());

CREATE POLICY "subscriptions_insert_own" ON public.subscriptions
  FOR INSERT WITH CHECK (user_id = auth_uid());

CREATE POLICY "subscriptions_update_own" ON public.subscriptions
  FOR UPDATE USING (user_id = auth_uid()) WITH CHECK (user_id = auth_uid());

CREATE POLICY "subscriptions_delete_own" ON public.subscriptions
  FOR DELETE USING (user_id = auth_uid());

-- ============================================================
-- API KEYS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  key_hash    TEXT NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '[]',
  rate_limit  INTEGER NOT NULL DEFAULT 100 CHECK (rate_limit >= 1 AND rate_limit <= 10000),
  last_used_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);

CREATE TRIGGER trg_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: API Keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_select_own" ON public.api_keys
  FOR SELECT USING (user_id = auth_uid());

CREATE POLICY "api_keys_insert_own" ON public.api_keys
  FOR INSERT WITH CHECK (user_id = auth_uid());

CREATE POLICY "api_keys_update_own" ON public.api_keys
  FOR UPDATE USING (user_id = auth_uid()) WITH CHECK (user_id = auth_uid());

CREATE POLICY "api_keys_delete_own" ON public.api_keys
  FOR DELETE USING (user_id = auth_uid());

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL CHECK (char_length(action) >= 1 AND char_length(action) <= 100),
  metadata    JSONB NOT NULL DEFAULT '{}',
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- RLS: Audit Logs — only the user can see their own logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_own" ON public.audit_logs
  FOR SELECT USING (user_id = auth_uid());

CREATE POLICY "audit_logs_insert_own" ON public.audit_logs
  FOR INSERT WITH CHECK (user_id = auth_uid() OR user_id IS NULL);

-- ============================================================
-- REPORTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  room_id         UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  reason          TEXT NOT NULL CHECK (reason IN ('harassment', 'spam', 'inappropriate_content', 'cheating', 'other')),
  details         TEXT CHECK (details IS NULL OR char_length(details) <= 2000),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  moderator_notes TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON public.reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_room ON public.reports(room_id) WHERE room_id IS NOT NULL;

CREATE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: Reports — reporter can see own reports, admins can see all
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select_own" ON public.reports
  FOR SELECT USING (reporter_id = auth_uid());

CREATE POLICY "reports_insert_own" ON public.reports
  FOR INSERT WITH CHECK (reporter_id = auth_uid());

CREATE POLICY "reports_update_own" ON public.reports
  FOR UPDATE USING (reporter_id = auth_uid()) WITH CHECK (reporter_id = auth_uid());

-- ============================================================
-- EMBED CONFIGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.embed_configs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id         UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  theme           TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'auto')),
  features        JSONB NOT NULL DEFAULT '{"chat": true, "sync": true, "members": true}',
  allowed_origins TEXT[] NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embed_configs_user ON public.embed_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_embed_configs_room ON public.embed_configs(room_id);
CREATE INDEX IF NOT EXISTS idx_embed_configs_active ON public.embed_configs(is_active) WHERE is_active = TRUE;

CREATE TRIGGER trg_embed_configs_updated_at
  BEFORE UPDATE ON public.embed_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: Embed Configs
ALTER TABLE public.embed_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "embed_configs_select_own_or_room_host" ON public.embed_configs
  FOR SELECT USING (
    user_id = auth_uid()
    OR EXISTS (
      SELECT 1 FROM public.rooms WHERE id = embed_configs.room_id AND host_id = auth_uid()
    )
  );

CREATE POLICY "embed_configs_insert_own" ON public.embed_configs
  FOR INSERT WITH CHECK (user_id = auth_uid());

CREATE POLICY "embed_configs_update_own" ON public.embed_configs
  FOR UPDATE USING (user_id = auth_uid()) WITH CHECK (user_id = auth_uid());

CREATE POLICY "embed_configs_delete_own" ON public.embed_configs
  FOR DELETE USING (user_id = auth_uid());

-- ============================================================
-- REALTIME PUBLICATION
-- Enable Supabase Realtime for tables that need live updates.
-- Idempotent: ignore if the table is already a member.
-- ============================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.timeline_reactions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
