-- SyncSaga Migration 009: Indexes
-- Requires: All previous migrations
-- Idempotent: YES (all IF NOT EXISTS)

-- ============================================
-- PROFILES INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- ============================================
-- FRIENDSHIPS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

-- ============================================
-- ROOMS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_rooms_is_public ON public.rooms(is_private);
CREATE INDEX IF NOT EXISTS idx_rooms_created ON public.rooms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rooms_host ON public.rooms(host_id);

-- ============================================
-- ROOM MEMBERS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_room_members_room ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON public.room_members(user_id);

-- ============================================
-- MESSAGES INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_messages_room_created ON public.messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id);

-- ============================================
-- MESSAGE REACTIONS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions(message_id);

-- ============================================
-- NOTIFICATIONS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);

-- ============================================
-- CONVERSATIONS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON public.conversations(participant1_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON public.conversations(participant2_id, last_message_at DESC);

-- ============================================
-- TIMELINE REACTIONS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_timeline_reactions_room ON public.timeline_reactions(room_id, timestamp_sec);

-- ============================================
-- CLIPS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_clips_user ON public.clips(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clips_anime ON public.clips(anime_title);

-- ============================================
-- WATCH EVENTS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_watch_events_user ON public.watch_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_events_anime ON public.watch_events(anime_id, episode_number);
CREATE INDEX IF NOT EXISTS idx_watch_events_completed ON public.watch_events(anime_id) WHERE completed = true;

-- ============================================
-- SCHEDULED ROOMS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_scheduled_rooms_time ON public.scheduled_rooms(scheduled_at);

-- ============================================
-- BANS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_bans_user ON public.bans(user_id);

-- ============================================
-- ACTIVITY FEED INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON public.activity_feed(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON public.activity_feed(created_at DESC);

-- ============================================
-- SUBSCRIPTIONS INDEXES
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);

-- ============================================
-- AUDIT LOGS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ============================================
-- PRESENCE LOG INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_presence_log_user ON public.presence_log(user_id, created_at DESC);

-- ============================================
-- ANALYTICS EVENTS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON public.analytics_events(event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON public.analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON public.analytics_events(session_id);

-- ============================================
-- ROOM METRICS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_room_metrics_date ON public.room_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_room_metrics_room_date ON public.room_metrics(room_id, date DESC);

-- ============================================
-- EXTENSION TELEMETRY INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_extension_telemetry_user ON public.extension_telemetry(user_id, created_at DESC);

-- ============================================
-- ANIME METADATA INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_anime_metadata_search ON public.anime_metadata USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_anime_metadata_mal ON public.anime_metadata(mal_id);
CREATE INDEX IF NOT EXISTS idx_anime_metadata_anilist ON public.anime_metadata(anilist_id);

-- ============================================
-- EPISODE FINGERPRINTS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_fingerprints_hash ON public.episode_fingerprints USING gin(hash_index);
CREATE INDEX IF NOT EXISTS idx_fingerprints_anime ON public.episode_fingerprints(anime_id, episode_number);

-- ============================================
-- USER ACHIEVEMENTS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
