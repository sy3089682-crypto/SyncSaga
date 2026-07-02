import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { redisService } from './redis.service';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import type { Server as SocketIOServer } from 'socket.io';

/**
 * BullMQ Queue System for Background Job Processing
 *
 * Queues:
 * - audit: Audit log writes (fire-and-forget, non-blocking)
 * - notifications: Notification creation and delivery
 * - ai: AI processing jobs (recommendations, summaries, recaps)
 * - activity: Activity feed updates
 *
 * Each queue has:
 * - Retry with exponential backoff
 * - Dead-letter queue (max attempts exceeded)
 * - Concurrency control
 * - Graceful shutdown
 */

const QUEUE_PREFIX = 'syncsaga';
const MAX_RETRIES = 3;
const BACKOFF_MS = 2000;

let io: SocketIOServer | null = null;

export function setQueueSocket(socketIO: SocketIOServer): void {
  io = socketIO;
}

// ============================================================
// Queue Definitions
// ============================================================

export const auditQueue = new Queue('audit', {
  connection: redisService.getClient() as any,
  prefix: QUEUE_PREFIX,
  defaultJobOptions: {
    attempts: MAX_RETRIES,
    backoff: { type: 'exponential', delay: BACKOFF_MS },
    removeOnComplete: { count: 1000, age: 86400 },
    removeOnFail: { count: 5000, age: 7 * 86400 },
  },
});

export const notificationQueue = new Queue('notifications', {
  connection: redisService.getClient() as any,
  prefix: QUEUE_PREFIX,
  defaultJobOptions: {
    attempts: MAX_RETRIES,
    backoff: { type: 'exponential', delay: BACKOFF_MS },
    removeOnComplete: { count: 500, age: 86400 },
    removeOnFail: { count: 5000, age: 7 * 86400 },
  },
});

export const aiQueue = new Queue('ai', {
  connection: redisService.getClient() as any,
  prefix: QUEUE_PREFIX,
  defaultJobOptions: {
    attempts: MAX_RETRIES,
    backoff: { type: 'exponential', delay: BACKOFF_MS * 2 },
    removeOnComplete: { count: 200, age: 3600 },
    removeOnFail: { count: 1000, age: 7 * 86400 },
  },
});

export const activityQueue = new Queue('activity', {
  connection: redisService.getClient() as any,
  prefix: QUEUE_PREFIX,
  defaultJobOptions: {
    attempts: MAX_RETRIES,
    backoff: { type: 'exponential', delay: BACKOFF_MS },
    removeOnComplete: { count: 1000, age: 86400 },
    removeOnFail: { count: 5000, age: 7 * 86400 },
  },
});

// ============================================================
// Queue Events (monitoring)
// ============================================================

const auditEvents = new QueueEvents('audit', {
  connection: redisService.getClient() as any,
  prefix: QUEUE_PREFIX,
});

auditEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error({ jobId, queue: 'audit', reason: failedReason }, 'Audit job failed after retries — dead-lettered');
});

const notificationEvents = new QueueEvents('notifications', {
  connection: redisService.getClient() as any,
  prefix: QUEUE_PREFIX,
});

notificationEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error({ jobId, queue: 'notifications', reason: failedReason }, 'Notification job failed after retries — dead-lettered');
});

const aiEvents = new QueueEvents('ai', {
  connection: redisService.getClient() as any,
  prefix: QUEUE_PREFIX,
});

aiEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error({ jobId, queue: 'ai', reason: failedReason }, 'AI job failed after retries — dead-lettered');
});

// ============================================================
// Workers
// ============================================================

const auditWorker = new Worker('audit', async (job: Job) => {
  const { action, userId, metadata } = job.data;
  const { error } = await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    metadata: metadata || {},
    ip_address: null,
    user_agent: null,
  });

  if (error) {
    throw new Error(`Audit log insert failed: ${error.message}`);
  }

  logger.debug({ action, userId }, 'Audit log written via queue');
}, {
  connection: redisService.getClient() as any,
  prefix: QUEUE_PREFIX,
  concurrency: 5,
});

auditWorker.on('error', (err) => {
  logger.error({ err }, 'Audit worker error');
});

const notificationWorker = new Worker('notifications', async (job: Job) => {
  const { userId, type, title, body, data } = job.data;

  const { data: notification, error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    data: data || {},
  }).select().single();

  if (error) {
    throw new Error(`Notification insert failed: ${error.message}`);
  }

  // Deliver via Socket.IO if connected
  if (io && notification) {
    io.to(`user:${userId}`).emit('notification:new', notification);
  }

  logger.debug({ userId, type }, 'Notification delivered via queue');
}, {
  connection: redisService.getClient() as any,
  prefix: QUEUE_PREFIX,
  concurrency: 3,
});

notificationWorker.on('error', (err) => {
  logger.error({ err }, 'Notification worker error');
});

const activityWorker = new Worker('activity', async (job: Job) => {
  const { userId, type, data } = job.data;

  const { error } = await supabase.from('activity_feed').insert({
    user_id: userId,
    type,
    data: data || {},
  });

  if (error) {
    throw new Error(`Activity feed insert failed: ${error.message}`);
  }

  logger.debug({ userId, type }, 'Activity feed updated via queue');
}, {
  connection: redisService.getClient() as any,
  prefix: QUEUE_PREFIX,
  concurrency: 5,
});

activityWorker.on('error', (err) => {
  logger.error({ err }, 'Activity worker error');
});

// AI worker processes jobs that may take longer
const aiWorker = new Worker('ai', async (job: Job) => {
  const { task, payload } = job.data;

  // AI jobs are dispatched to the AI router
  // The actual AI processing happens in ai.service.ts
  // This worker handles the queue orchestration
  logger.info({ task, jobId: job.id }, 'AI job processing started');

  // The AI service will be called by the route handler
  // This worker is for background AI tasks (e.g., pre-generating recaps)
  switch (task) {
    case 'precompute_recommendations':
      // Fetch user's watch history and pre-compute recommendations
      logger.info({ userId: payload.userId }, 'Pre-computing AI recommendations');
      break;
    case 'generate_recap':
      logger.info({ roomId: payload.roomId }, 'Generating AI recap');
      break;
    default:
      logger.warn({ task }, 'Unknown AI job task');
  }
}, {
  connection: redisService.getClient() as any,
  prefix: QUEUE_PREFIX,
  concurrency: 2,
  lockDuration: 60000, // AI jobs may take up to 60s
});

aiWorker.on('error', (err) => {
  logger.error({ err }, 'AI worker error');
});

aiWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, 'AI job failed');
});

// ============================================================
// Public API — enqueue helpers
// ============================================================

export const queueService = {
  /**
   * Enqueue an audit log entry (fire-and-forget).
   */
  async audit(action: string, userId: string, metadata?: Record<string, unknown>): Promise<void> {
    await auditQueue.add('log', { action, userId, metadata });
  },

  /**
   * Enqueue a notification.
   */
  async notify(userId: string, type: string, title: string, body?: string, data?: Record<string, unknown>): Promise<void> {
    await notificationQueue.add('notify', { userId, type, title, body, data });
  },

  /**
   * Enqueue an activity feed entry.
   */
  async activity(userId: string, type: string, data?: Record<string, unknown>): Promise<void> {
    await activityQueue.add('activity', { userId, type, data });
  },

  /**
   * Enqueue an AI processing job.
   */
  async ai(task: string, payload: Record<string, unknown>): Promise<void> {
    await aiQueue.add(task, { task, payload });
  },

  /**
   * Get queue metrics for monitoring.
   */
  async getMetrics(): Promise<Record<string, any>> {
    const [audit, notif, ai, activity] = await Promise.all([
      auditQueue.getJobCounts(),
      notificationQueue.getJobCounts(),
      aiQueue.getJobCounts(),
      activityQueue.getJobCounts(),
    ]);

    return {
      audit,
      notifications: notif,
      ai,
      activity,
    };
  },

  /**
   * Graceful shutdown — close all workers and queues.
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down BullMQ workers and queues...');

    const shutdownPromises: Promise<void>[] = [];

    // Close workers first (stop processing new jobs)
    shutdownPromises.push(
      auditWorker.close().then(() => {}),
      notificationWorker.close().then(() => {}),
      activityWorker.close().then(() => {}),
      aiWorker.close().then(() => {}),
    );

    await Promise.allSettled(shutdownPromises);

    // Close queues
    const queuePromises: Promise<void>[] = [
      auditQueue.close().then(() => {}),
      notificationQueue.close().then(() => {}),
      aiQueue.close().then(() => {}),
      activityQueue.close().then(() => {}),
      auditEvents.close().then(() => {}),
      notificationEvents.close().then(() => {}),
      aiEvents.close().then(() => {}),
    ];

    await Promise.allSettled(queuePromises);

    logger.info('BullMQ workers and queues shut down');
  },
};
