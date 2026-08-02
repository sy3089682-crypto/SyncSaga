import { pgTable, uuid, text, boolean, integer, doublePrecision, jsonb, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

/**
 * SyncSaga Database Schema (Drizzle ORM)
 *
 * This schema mirrors the SQL migration in migrations/00001_initial_schema.sql.
 * The SQL migration is the source of truth — this file is used for:
 * - TypeScript type inference
 * - Drizzle Studio for development
 * - Generating new migrations via `npm run db:generate`
 *
 * Key changes from original schema:
 * - profiles.id now references auth.users(id) instead of random UUID
 * - Added CHECK constraints (status enums, length limits)
 * - Added missing indexes on hot paths
 * - RLS policies are defined in SQL migrations (not Drizzle)
 */

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().notNull(),
  username: text('username').notNull().unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  bannerUrl: text('banner_url'),
  bio: text('bio'),
  status: text('status').default('offline').notNull(),
  customStatus: text('custom_status'),
  themePreference: text('theme_preference').default('dark').notNull(),
  accentColor: text('accent_color').default('#FF6A5B').notNull(),
  totpEnabled: boolean('totp_enabled').default(false).notNull(),
  totpSecret: text('totp_secret'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  usernameIdx: index('idx_profiles_username').on(table.username),
  statusIdx: index('idx_profiles_status').on(table.status),
  createdAtIdx: index('idx_profiles_created_at').on(table.createdAt),
}));

export const friendships = pgTable('friendships', {
  id: uuid('id').primaryKey().defaultRandom(),
  requesterId: uuid('requester_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  addresseeId: uuid('addressee_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  status: text('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  requesterIdx: index('idx_friendships_requester').on(table.requesterId),
  addresseeIdx: index('idx_friendships_addressee').on(table.addresseeId),
  statusIdx: index('idx_friendships_status').on(table.status),
  uniquePair: uniqueIndex('uq_friendships_pair').on(table.requesterId, table.addresseeId),
}));

export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  bannerUrl: text('banner_url'),
  isPrivate: boolean('is_private').default(false).notNull(),
  passwordHash: text('password_hash'),
  maxUsers: integer('max_users').default(10).notNull(),
  hostId: uuid('host_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  coHosts: uuid('co_hosts').array().default([]).notNull(),
  currentEpisode: text('current_episode'),
  mediaId: integer('media_id'),
  animeTitle: text('anime_title'),
  episodeNumber: integer('episode_number'),
  playbackState: text('playback_state').default('paused').notNull(),
  currentTimestamp: doublePrecision('current_timestamp').default(0).notNull(),
  duration: doublePrecision('duration').default(0).notNull(),
  syncLocked: boolean('sync_locked').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  hostIdx: index('idx_rooms_host').on(table.hostId),
  privateIdx: index('idx_rooms_private').on(table.isPrivate),
  createdAtIdx: index('idx_rooms_created_at').on(table.createdAt),
  mediaIdx: index('idx_rooms_media').on(table.mediaId),
}));

export const roomMembers = pgTable('room_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  role: text('role').default('member').notNull(),
  isBanned: boolean('is_banned').default(false).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  leftAt: timestamp('left_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  roomIdx: index('idx_room_members_room').on(table.roomId),
  userIdx: index('idx_room_members_user').on(table.userId),
  bannedIdx: index('idx_room_members_banned').on(table.isBanned),
  uniqueRoomUser: uniqueIndex('uq_room_members_room_user').on(table.roomId, table.userId),
}));

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  recipientId: uuid('recipient_id').references(() => profiles.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  type: text('type').default('text').notNull(),
  replyToId: uuid('reply_to_id').references((): any => messages.id, { onDelete: 'set null' }),
  isPinned: boolean('is_pinned').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  roomCreatedIdx: index('idx_messages_room_created').on(table.roomId, table.createdAt),
  senderIdx: index('idx_messages_sender').on(table.senderId),
  pinnedIdx: index('idx_messages_pinned').on(table.roomId),
  replyIdx: index('idx_messages_reply').on(table.replyToId),
}));

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body'),
  data: jsonb('data').default({}).notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userUnreadIdx: index('idx_notifications_user_unread').on(table.userId),
  userCreatedIdx: index('idx_notifications_user_created').on(table.userId, table.createdAt),
  typeIdx: index('idx_notifications_type').on(table.type),
}));

export const clips = pgTable('clips', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  animeTitle: text('anime_title'),
  episodeNumber: integer('episode_number'),
  startTime: doublePrecision('start_time').notNull(),
  endTime: doublePrecision('end_time').notNull(),
  duration: doublePrecision('duration').default(0).notNull(),
  title: text('title'),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),
  videoUrl: text('video_url'),
  isPublic: boolean('is_public').default(true).notNull(),
  viewCount: integer('view_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('idx_clips_user').on(table.userId),
  publicIdx: index('idx_clips_public').on(table.isPublic, table.createdAt),
  roomIdx: index('idx_clips_room').on(table.roomId),
  animeIdx: index('idx_clips_anime').on(table.animeTitle),
}));

export const timelineReactions = pgTable('timeline_reactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  timestampSec: doublePrecision('timestamp_sec').notNull(),
  type: text('type').notNull(),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  roomIdx: index('idx_timeline_reactions_room').on(table.roomId, table.timestampSec),
  userIdx: index('idx_timeline_reactions_user').on(table.userId),
  typeIdx: index('idx_timeline_reactions_type').on(table.type),
}));

export const activityFeed = pgTable('activity_feed', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  data: jsonb('data').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('idx_activity_feed_user').on(table.userId, table.createdAt),
  typeIdx: index('idx_activity_feed_type').on(table.type),
}));

export const watchEvents = pgTable('watch_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  animeId: integer('anime_id').notNull(),
  animeTitle: text('anime_title').notNull(),
  episodeNumber: integer('episode_number').notNull(),
  episodeTitle: text('episode_title'),
  durationSeconds: integer('duration_seconds').default(0).notNull(),
  completed: boolean('completed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userAnimeIdx: index('idx_watch_events_user_anime').on(table.userId, table.animeId),
  userCreatedIdx: index('idx_watch_events_user_created').on(table.userId, table.createdAt),
  completedIdx: index('idx_watch_events_completed').on(table.userId),
  uniqueUserAnimeEp: uniqueIndex('uq_watch_events_user_anime_ep').on(table.userId, table.animeId, table.episodeNumber),
}));

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  plan: text('plan').default('free').notNull(),
  status: text('status').default('active').notNull(),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueUser: uniqueIndex('uq_subscriptions_user').on(table.userId),
  stripeIdx: index('idx_subscriptions_stripe').on(table.stripeSubscriptionId),
  statusIdx: index('idx_subscriptions_status').on(table.status),
}));

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  permissions: jsonb('permissions').default([]).notNull(),
  rateLimit: integer('rate_limit').default(100).notNull(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('idx_api_keys_user').on(table.userId),
  hashIdx: index('idx_api_keys_hash').on(table.keyHash),
}));

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('idx_audit_logs_user').on(table.userId, table.createdAt),
  actionIdx: index('idx_audit_logs_action').on(table.action),
  createdAtIdx: index('idx_audit_logs_created_at').on(table.createdAt),
}));

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reporterId: uuid('reporter_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  reportedId: uuid('reported_id').references(() => profiles.id, { onDelete: 'set null' }),
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  reason: text('reason').notNull(),
  details: text('details'),
  status: text('status').default('pending').notNull(),
  moderatorNotes: text('moderator_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  reporterIdx: index('idx_reports_reporter').on(table.reporterId),
  reportedIdx: index('idx_reports_reported').on(table.reportedId),
  statusIdx: index('idx_reports_status').on(table.status),
  roomIdx: index('idx_reports_room').on(table.roomId),
}));

export const embedConfigs = pgTable('embed_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  roomId: uuid('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  theme: text('theme').default('dark').notNull(),
  features: jsonb('features').default({ chat: true, sync: true, members: true }).notNull(),
  allowedOrigins: text('allowed_origins').array().default([]).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('idx_embed_configs_user').on(table.userId),
  roomIdx: index('idx_embed_configs_room').on(table.roomId),
  activeIdx: index('idx_embed_configs_active').on(table.isActive),
}));
