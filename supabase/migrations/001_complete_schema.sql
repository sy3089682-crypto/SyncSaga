-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  pronouns TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  rank TEXT DEFAULT 'newcomer' CHECK (rank IN ('newcomer','watcher','otaku','elite','legend')),
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free','plus','pro')),
  synccoins INTEGER DEFAULT 100,
  syncgems INTEGER DEFAULT 0,
  trust_score DECIMAL(3,2) DEFAULT 1.0,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  subscription_period_end TIMESTAMPTZ,
  badges JSONB DEFAULT '[]',
  equipped_badge TEXT,
  custom_status TEXT,
  status TEXT DEFAULT 'offline' CHECK (status IN ('online','offline','away','watching')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  anime_id INTEGER,
  anime_title TEXT,
  anime_image TEXT,
  episode_number INTEGER,
  streaming_platform TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  is_locked BOOLEAN DEFAULT FALSE,
  password_hash TEXT,
  max_members INTEGER DEFAULT 50,
  theme TEXT DEFAULT 'default',
  allow_soundboard BOOLEAN DEFAULT TRUE,
  allow_reactions BOOLEAN DEFAULT TRUE,
  sync_lock BOOLEAN DEFAULT FALSE,
  co_hosts UUID[] DEFAULT '{}',
  banned_users UUID[] DEFAULT '{}',
  playback_position DECIMAL DEFAULT 0,
  playback_state TEXT DEFAULT 'paused',
  playback_speed DECIMAL DEFAULT 1.0,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  member_count INTEGER DEFAULT 0,
  peak_member_count INTEGER DEFAULT 0,
  total_watch_time INTEGER DEFAULT 0,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room members
CREATE TABLE room_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('host','co_host','moderator','member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text','system','reaction','gif','danmaku')),
  reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friends
CREATE TABLE friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Watchlist
CREATE TABLE watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  anime_id INTEGER NOT NULL,
  anime_title TEXT NOT NULL,
  anime_image TEXT,
  status TEXT DEFAULT 'plan_to_watch' CHECK (status IN ('watching','completed','plan_to_watch','dropped','on_hold')),
  episodes_watched INTEGER DEFAULT 0,
  total_episodes INTEGER,
  score INTEGER CHECK (score BETWEEN 1 AND 10),
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, anime_id)
);

-- Achievements
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  points INTEGER DEFAULT 10,
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary')),
  hidden BOOLEAN DEFAULT FALSE,
  condition_type TEXT,
  condition_value INTEGER
);

-- User achievements
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Servers (communities)
CREATE TABLE servers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  banner_url TEXT,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  is_public BOOLEAN DEFAULT TRUE,
  member_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Server members
CREATE TABLE server_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner','admin','moderator','member')),
  nickname TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, user_id)
);

-- Channels
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text','voice','announcement')),
  position INTEGER DEFAULT 0,
  topic TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quests
CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily','weekly','monthly','special')),
  xp_reward INTEGER DEFAULT 50,
  coin_reward INTEGER DEFAULT 10,
  condition_type TEXT NOT NULL,
  condition_value INTEGER NOT NULL,
  icon TEXT DEFAULT '🎯',
  expires_at TIMESTAMPTZ
);

-- User quests
CREATE TABLE user_quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, quest_id)
);

-- Coin transactions
CREATE TABLE coin_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn','spend','gift','bonus')),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watch history
CREATE TABLE watch_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  anime_id INTEGER NOT NULL,
  anime_title TEXT NOT NULL,
  episode_number INTEGER NOT NULL,
  watch_duration INTEGER DEFAULT 0,
  watched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled rooms
CREATE TABLE scheduled_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  anime_title TEXT NOT NULL,
  anime_id INTEGER,
  episode INTEGER NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reactions (floating emoji on video)
CREATE TABLE video_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT,
  timestamp_sec DECIMAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clips
CREATE TABLE clips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  anime_title TEXT NOT NULL,
  episode_number INTEGER,
  start_time DECIMAL NOT NULL,
  end_time DECIMAL NOT NULL,
  title TEXT,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rooms_is_public ON rooms(is_public) WHERE ended_at IS NULL;
CREATE INDEX idx_rooms_host_id ON rooms(host_id);
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX idx_friends_user_id ON friends(user_id);
CREATE INDEX idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX idx_watch_history_user_id ON watch_history(user_id);
CREATE INDEX idx_profiles_username ON profiles USING gin(username gin_trgm_ops);
CREATE INDEX idx_profiles_display_name ON profiles USING gin(display_name gin_trgm_ops);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- Public read for rooms
CREATE POLICY "rooms_public_read" ON rooms FOR SELECT USING (is_public = TRUE);
CREATE POLICY "rooms_host_all" ON rooms FOR ALL USING (auth.uid() = host_id);
CREATE POLICY "room_members_read" ON room_members FOR SELECT USING (TRUE);
CREATE POLICY "room_members_self" ON room_members FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_self_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "messages_room_read" ON messages FOR SELECT USING (TRUE);
CREATE POLICY "messages_self_insert" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "messages_self_update" ON messages FOR UPDATE USING (auth.uid() = sender_id);
CREATE POLICY "friends_self" ON friends FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "watchlist_self" ON watchlist FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "notifications_self" ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_achievements_read" ON user_achievements FOR SELECT USING (TRUE);
CREATE POLICY "user_achievements_self" ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_quests_self" ON user_quests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "coin_transactions_self" ON coin_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "watch_history_self" ON watch_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "clips_public_read" ON clips FOR SELECT USING (is_public = TRUE);
CREATE POLICY "clips_self" ON clips FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "servers_public_read" ON servers FOR SELECT USING (is_public = TRUE);
CREATE POLICY "servers_owner" ON servers FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "server_members_read" ON server_members FOR SELECT USING (TRUE);
CREATE POLICY "server_members_self" ON server_members FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "channels_read" ON channels FOR SELECT USING (TRUE);

-- Functions
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update member count
CREATE OR REPLACE FUNCTION update_room_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE rooms SET member_count = member_count + 1 WHERE id = NEW.room_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE rooms SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.room_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER room_member_count_trigger
  AFTER INSERT OR DELETE ON room_members
  FOR EACH ROW EXECUTE FUNCTION update_room_member_count();

-- Seed achievements
INSERT INTO achievements (name, description, icon, category, points, rarity, condition_type, condition_value) VALUES
  ('First Watch', 'Watch your first episode together', '👁️', 'social', 10, 'common', 'watch_sessions', 1),
  ('Social Butterfly', 'Make 10 friends', '🦋', 'social', 50, 'rare', 'friends_count', 10),
  ('Binge Master', 'Watch 100 episodes in rooms', '📺', 'watch', 100, 'epic', 'episodes_watched', 100),
  ('Legend Status', 'Reach Legend rank', '🏆', 'rank', 500, 'legendary', 'rank_reached', 5),
  ('Room Creator', 'Create your first room', '🎭', 'social', 10, 'common', 'rooms_created', 1),
  ('Night Owl', 'Watch anime past midnight 10 times', '🦉', 'watch', 50, 'rare', 'late_night_watches', 10),
  ('Speed Watcher', 'Watch at 2x speed for 5 hours', '⚡', 'watch', 30, 'rare', 'speed_watch_hours', 5),
  ('Supporter', 'Subscribe to Plus or Pro', '💎', 'special', 100, 'rare', 'subscription', 1);

-- Seed quests
INSERT INTO quests (name, description, type, xp_reward, coin_reward, condition_type, condition_value, icon) VALUES
  ('Daily Watcher', 'Watch 1 episode in a room today', 'daily', 50, 10, 'daily_episodes', 1, '📺'),
  ('Social Hour', 'Send 10 messages in rooms today', 'daily', 30, 5, 'daily_messages', 10, '💬'),
  ('Friend Maker', 'Accept or send 1 friend request', 'daily', 20, 5, 'daily_friend_actions', 1, '🤝'),
  ('Weekly Binge', 'Watch 10 episodes this week', 'weekly', 200, 50, 'weekly_episodes', 10, '🎯'),
  ('Weekly Social', 'Join 5 different rooms this week', 'weekly', 150, 30, 'weekly_rooms_joined', 5, '🌐');
