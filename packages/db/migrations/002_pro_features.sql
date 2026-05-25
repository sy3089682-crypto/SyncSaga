-- SyncSaga Schema v3 - Production Pro Features
-- Run after schema.sql

-- ============================================
-- SUBSCRIPTIONS
-- ============================================
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);

-- ============================================
-- AUDIT LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ============================================
-- REACTION RATE LIMITING EXTENSION
-- ============================================
ALTER TABLE public.timeline_reactions DROP CONSTRAINT IF EXISTS timeline_reactions_type_check;
ALTER TABLE public.timeline_reactions ADD CONSTRAINT timeline_reactions_type_check
    CHECK (type IN ('laugh', 'cry', 'shock', 'fire', 'heart', 'gg', 'voice', 'text', 'clap', 'pepe'));

-- ============================================
-- MESSAGE REACTIONS (per-message emoji reactions)
-- ============================================
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions(message_id);

-- ============================================
-- USER PRESENCE HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS public.presence_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presence_log_user ON public.presence_log(user_id, created_at DESC);

-- ============================================
-- ANALYTICS EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event TEXT NOT NULL,
    properties JSONB DEFAULT '{}',
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON public.analytics_events(event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON public.analytics_events(user_id, created_at DESC);

-- ============================================
-- DM CONVERSATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    participant2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(participant1_id, participant2_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON public.conversations(participant1_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON public.conversations(participant2_id, last_message_at DESC);

-- ============================================
-- ROOM METRICS
-- ============================================
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

-- ============================================
-- EXTENSION TELEMETRY
-- ============================================
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

-- ============================================
-- ADDITIONAL INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_room_metrics_date ON public.room_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_extension_telemetry_user ON public.extension_telemetry(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON public.analytics_events(session_id);

-- ============================================
-- UPDATED TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTION: array_append_unique
-- ============================================
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
