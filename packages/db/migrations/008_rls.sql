-- SyncSaga Migration 008: Row Level Security
-- Requires: All previous migrations
-- Idempotent: YES (all DROP/CREATE POLICY patterns)

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
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

-- ============================================
-- PROFILES
-- ============================================
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================
-- BLOCKED USERS
-- ============================================
DROP POLICY IF EXISTS "Users can manage own blocks" ON public.blocked_users;
CREATE POLICY "Users can manage own blocks"
    ON public.blocked_users FOR ALL
    USING (auth.uid() = blocker_id)
    WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can see if they are blocked" ON public.blocked_users;
CREATE POLICY "Users can see if they are blocked"
    ON public.blocked_users FOR SELECT
    USING (auth.uid() = blocked_id);

-- ============================================
-- BANS
-- ============================================
DROP POLICY IF EXISTS "Bans manageable by admins" ON public.bans;
CREATE POLICY "Bans manageable by admins"
    ON public.bans FOR ALL
    USING (auth.uid() = banned_by);

-- ============================================
-- WEBHOOKS
-- ============================================
DROP POLICY IF EXISTS "Users can manage own webhooks" ON public.webhooks;
CREATE POLICY "Users can manage own webhooks"
    ON public.webhooks FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- API KEYS
-- ============================================
DROP POLICY IF EXISTS "Users can manage own API keys" ON public.api_keys;
CREATE POLICY "Users can manage own API keys"
    ON public.api_keys FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- REPORTS
-- ============================================
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports"
    ON public.reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can see own reports" ON public.reports;
CREATE POLICY "Users can see own reports"
    ON public.reports FOR SELECT
    USING (auth.uid() = reporter_id);

-- ============================================
-- ROOMS
-- ============================================
DROP POLICY IF EXISTS "Public rooms are viewable" ON public.rooms;
CREATE POLICY "Public rooms are viewable"
    ON public.rooms FOR SELECT
    USING (is_private = false);

DROP POLICY IF EXISTS "Private rooms viewable by members" ON public.rooms;
CREATE POLICY "Private rooms viewable by members"
    ON public.rooms FOR SELECT
    USING (
        is_private = true AND EXISTS (
            SELECT 1 FROM public.room_members
            WHERE room_id = rooms.id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create rooms" ON public.rooms;
CREATE POLICY "Users can create rooms"
    ON public.rooms FOR INSERT
    WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Host can update own room" ON public.rooms;
CREATE POLICY "Host can update own room"
    ON public.rooms FOR UPDATE
    USING (auth.uid() = host_id);

-- ============================================
-- ROOM MEMBERS
-- ============================================
DROP POLICY IF EXISTS "Members viewable by room members" ON public.room_members;
CREATE POLICY "Members viewable by room members"
    ON public.room_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.room_members rm
            WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can join rooms" ON public.room_members;
CREATE POLICY "Users can join rooms"
    ON public.room_members FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave rooms" ON public.room_members;
CREATE POLICY "Users can leave rooms"
    ON public.room_members FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- ROOM INVITES
-- ============================================
DROP POLICY IF EXISTS "Invites viewable by participants" ON public.room_invites;
CREATE POLICY "Invites viewable by participants"
    ON public.room_invites FOR SELECT
    USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

DROP POLICY IF EXISTS "Members can create invites" ON public.room_invites;
CREATE POLICY "Members can create invites"
    ON public.room_invites FOR INSERT
    WITH CHECK (auth.uid() = inviter_id);

-- ============================================
-- EMBED CONFIGS
-- ============================================
DROP POLICY IF EXISTS "Users can manage own embed configs" ON public.embed_configs;
CREATE POLICY "Users can manage own embed configs"
    ON public.embed_configs FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FRIENDSHIPS
-- ============================================
DROP POLICY IF EXISTS "Friendships viewable by participants" ON public.friendships;
CREATE POLICY "Friendships viewable by participants"
    ON public.friendships FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
CREATE POLICY "Users can send friend requests"
    ON public.friendships FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can update own friendships" ON public.friendships;
CREATE POLICY "Users can update own friendships"
    ON public.friendships FOR UPDATE
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ============================================
-- MESSAGES
-- ============================================
DROP POLICY IF EXISTS "Messages viewable in joined rooms or DMs" ON public.messages;
CREATE POLICY "Messages viewable in joined rooms or DMs"
    ON public.messages FOR SELECT
    USING (
        room_id IS NULL
        OR EXISTS (
            SELECT 1 FROM public.room_members
            WHERE room_id = messages.room_id AND user_id = auth.uid()
        )
        OR auth.uid() = recipient_id
        OR auth.uid() = sender_id
    );

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages"
    ON public.messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- ============================================
-- MESSAGE REACTIONS
-- ============================================
DROP POLICY IF EXISTS "Users can manage own message reactions" ON public.message_reactions;
CREATE POLICY "Users can manage own message reactions"
    ON public.message_reactions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Message reactions viewable by participants" ON public.message_reactions;
CREATE POLICY "Message reactions viewable by participants"
    ON public.message_reactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.messages m
            LEFT JOIN public.room_members rm ON rm.room_id = m.room_id AND rm.user_id = auth.uid()
            WHERE m.id = message_reactions.message_id
            AND (m.room_id IS NULL OR rm.user_id IS NOT NULL OR m.sender_id = auth.uid() OR m.recipient_id = auth.uid())
        )
    );

-- ============================================
-- NOTIFICATIONS
-- ============================================
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

-- ============================================
-- CONVERSATIONS
-- ============================================
DROP POLICY IF EXISTS "Conversations viewable by participants" ON public.conversations;
CREATE POLICY "Conversations viewable by participants"
    ON public.conversations FOR SELECT
    USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- ============================================
-- ACTIVITY FEED
-- ============================================
DROP POLICY IF EXISTS "Activity feed viewable by friends" ON public.activity_feed;
CREATE POLICY "Activity feed viewable by friends"
    ON public.activity_feed FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.friendships
            WHERE status = 'accepted'
            AND ((requester_id = auth.uid() AND addressee_id = activity_feed.user_id)
              OR (addressee_id = auth.uid() AND requester_id = activity_feed.user_id))
        )
    );

DROP POLICY IF EXISTS "Users can create activity entries" ON public.activity_feed;
CREATE POLICY "Users can create activity entries"
    ON public.activity_feed FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TIMELINE REACTIONS
-- ============================================
DROP POLICY IF EXISTS "Timeline reactions viewable by room members" ON public.timeline_reactions;
CREATE POLICY "Timeline reactions viewable by room members"
    ON public.timeline_reactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.room_members
            WHERE room_id = timeline_reactions.room_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can react in joined rooms" ON public.timeline_reactions;
CREATE POLICY "Users can react in joined rooms"
    ON public.timeline_reactions FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.room_members
            WHERE room_id = timeline_reactions.room_id AND user_id = auth.uid()
        )
    );

-- ============================================
-- CLIPS
-- ============================================
DROP POLICY IF EXISTS "Public clips viewable" ON public.clips;
CREATE POLICY "Public clips viewable"
    ON public.clips FOR SELECT
    USING (is_public = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create clips" ON public.clips;
CREATE POLICY "Users can create clips"
    ON public.clips FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own clips" ON public.clips;
CREATE POLICY "Users can manage own clips"
    ON public.clips FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- WATCH EVENTS
-- ============================================
DROP POLICY IF EXISTS "Users can manage own watch events" ON public.watch_events;
CREATE POLICY "Users can manage own watch events"
    ON public.watch_events FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- SCHEDULED ROOMS
-- ============================================
DROP POLICY IF EXISTS "Scheduled rooms viewable" ON public.scheduled_rooms;
CREATE POLICY "Scheduled rooms viewable"
    ON public.scheduled_rooms FOR SELECT
    USING (is_active = true OR auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can schedule rooms" ON public.scheduled_rooms;
CREATE POLICY "Users can schedule rooms"
    ON public.scheduled_rooms FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- ============================================
-- USER ACHIEVEMENTS
-- ============================================
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
CREATE POLICY "Users can view own achievements"
    ON public.user_achievements FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Achievements viewable by anyone" ON public.achievements;
CREATE POLICY "Achievements viewable by anyone"
    ON public.achievements FOR SELECT
    USING (true);
