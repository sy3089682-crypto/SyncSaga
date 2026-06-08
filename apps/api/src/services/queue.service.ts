import { Queue, Worker, QueueEvents } from 'bullmq';
import { getEnv } from '@syncsaga/config';
import { logger } from '../lib/logger';
import Redis from 'ioredis';

const env = getEnv();
const redisConnection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Setup Main Task Queue
export const backgroundQueue = new Queue('background-tasks', {
  connection: redisConnection,
});

// Setup Worker to process jobs
export const backgroundWorker = new Worker(
  'background-tasks',
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'Processing background job');
    
    switch (job.name) {
      case 'process_ai_summary':
        // Heavy AI logic here (e.g. OpenAI API calls)
        await new Promise(resolve => setTimeout(resolve, 2000));
        break;
      case 'send_bulk_notifications':
        // Sending thousands of push notifications
        await new Promise(resolve => setTimeout(resolve, 1000));
        break;
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
    
    return { success: true };
  },
  { connection: redisConnection }
);

backgroundWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Job completed successfully');
});

backgroundWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Job failed');
});

// Setup Queue Events for monitoring
export const queueEvents = new QueueEvents('background-tasks', {
  connection: redisConnection,
});
