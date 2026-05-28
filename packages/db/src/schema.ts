import { pgTable, uuid, text, boolean, integer, float8, jsonb, timestamp, uniqueIndex, index, foreignKey, primaryKey } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  bannerUrl: text('banner_url'),
  bio: text('bio'),
  status: text('status').default('offline'),
  customStatus: text('custom_status'),
  themePreference: text('theme_preference').default('dark'),
  accentColor: text('accent_color').default('#8b5cf6'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const friendships = pgTable('friendships', {
  id: uuid('id').primaryKey().defaultRandom(),
  requesterId: uuid('requester_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  addresseeId: uuid('addressee_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  requesterIdx: index('idx_friendships_requester').on(table.requesterId),
  addresseeIdx: index('idx_friendships_addressee').on(table.addresseeId),
  unique: uniqueIndex('uq_friendships').on(table.requesterId, table.addresseeId),
}));

export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  bannerUrl: text('banner_url'),
  isPrivate: boolean('is_private').default(false),
  passwordHash: text('password_hash'),
  maxUsers: integer('max_users').default(10),
  hostId: uuid('host_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  coHosts: uuid('co_hosts').array().default('{}'),
  currentEpisode: text('current_episode'),
  currentEpisodeNumber: integer('current_episode_number'),
  playbackPosition: float8('playback_position').default(0),
  playbackState: text('playback_state').default('paused'),
  playbackSpeed: float8('playback_speed').default(1.0),
  animeTitle: text('anime_title'),
  animeMediaId: integer('anime_media_id'),
  animeCoverUrl: text('anime_cover_url'),
  animeEpisodeCount: integer('anime_episode_count'),
  syncLock: boolean('sync_lock').default(false),
  allowSoundboard: boolean('allow_soundboard').default(true),
  allowReactions: boolean('allow_reactions').default(true),
  bannedUsers: uuid('banned_users').array().default('{}'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  publicIdx: index('idx_rooms_is_public').on(table.isPrivate),
  createdIdx: index('idx_rooms_created').on(table.createdAt),
  hostIdx: index('idx_rooms_host').on(table.hostId),
}));

export const roomMembers = pgTable('room_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  role: text('role').default('member'),
  isBanned: boolean('is_banned').default(false),
  joinedAt: timestamp('joined_at').defaultNow(),
}, (table) => ({
  roomIdx: index('idx_room_members_room').on(table.roomId),
  userIdx: index('idx_room_members_user').on(table.userId),
  unique: uniqueIndex('uq_room_members').on(table.roomId, table.userId),
}));

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  recipientId: uuid('recipient_id').references(() => profiles.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  type: text('type').default('text'),
  replyToId: uuid('reply_to_id'),
  isPinned: boolean('is_pinned').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  roomCreatedIdx: index('idx_messages_room_created').on(table.roomId, table.createdAt),
  senderIdx: index('idx_messages_sender').on(table.senderId),
}));

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body'),
  data: jsonb('data'),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userReadIdx: index('idx_notifications_user').on(table.userId, table.isRead),
}));

export const clips = pgTable('clips', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  animeTitle: text('anime_title').notNull(),
  episodeNumber: integer('episode_number'),
  startTime: float8('start_time').notNull(),
  endTime: float8('end_time').notNull(),
  title: text('title'),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),
  viewCount: integer('view_count').default(0),
  isPublic: boolean('is_public').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_clips_user').on(table.userId, table.createdAt),
  animeIdx: index('idx_clips_anime').on(table.animeTitle),
}));

export const timelineReactions = pgTable('timeline_reactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  timestampSec: float8('timestamp_sec').notNull(),
  type: text('type').notNull(),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  roomIdx: index('idx_timeline_reactions_room').on(table.roomId, table.timestampSec),
}));

export const activityFeed = pgTable('activity_feed', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  data: jsonb('data').default('{}'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_activity_feed_user').on(table.userId, table.createdAt),
}));

export const watchEvents = pgTable('watch_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  animeId: text('anime_id').notNull(),
  animeTitle: text('anime_title').notNull(),
  episodeNumber: integer('episode_number').notNull(),
  episodeTitle: text('episode_title'),
  durationSeconds: integer('duration_seconds').notNull().default(0),
  completed: boolean('completed').default(false),
  rating: integer('rating'),
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_watch_events_user').on(table.userId, table.createdAt),
  animeIdx: index('idx_watch_events_anime').on(table.animeId, table.episodeNumber),
}));

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  plan: text('plan').notNull().default('free'),
  status: text('status').notNull().default('active'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdx: uniqueIndex('uq_subscriptions_user').on(table.userId),
}));

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  permissions: text('permissions').array().default('{read}'),
  rateLimit: integer('rate_limit').default(100),
  createdAt: timestamp('created_at').defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  metadata: jsonb('metadata').default('{}'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_audit_logs_user').on(table.userId, table.createdAt),
  actionIdx: index('idx_audit_logs_action').on(table.action),
}));

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reporterId: uuid('reporter_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  reportedId: uuid('reported_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  reason: text('reason').notNull(),
  details: text('details'),
  status: text('status').default('pending'),
  moderatorNotes: text('moderator_notes'),
  createdAt: timestamp('created_at').defaultNow(),
  resolvedAt: timestamp('resolved_at'),
});

export const embedConfigs = pgTable('embed_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  roomId: uuid('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  theme: text('theme').default('dark'),
  features: text('features').array().default('{chat,voice,sync}'),
  allowedOrigins: text('allowed_origins').array().default('{*}'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  unique: uniqueIndex('uq_embed_configs_room').on(table.roomId),
}));
