import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { getEnv } from '@syncsaga/config';

async function run() {
  console.log('Starting BullMQ Load Test...');
  const env = getEnv();
  
  const redisConnection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  const testQueue = new Queue('background-tasks', { connection: redisConnection });
  
  const TOTAL_JOBS = 500;
  console.log(`Queueing ${TOTAL_JOBS} heavy background jobs...`);
  
  const startTime = Date.now();
  
  const promises = [];
  for (let i = 0; i < TOTAL_JOBS; i++) {
    const isAi = i % 2 === 0;
    promises.push(
      testQueue.add(isAi ? 'process_ai_summary' : 'send_bulk_notifications', {
        payloadId: i,
        timestamp: Date.now()
      })
    );
  }
  
  await Promise.all(promises);
  console.log(`Successfully queued ${TOTAL_JOBS} jobs in ${Date.now() - startTime}ms.`);
  console.log('Workers should currently be processing these in the background without blocking the event loop.');
  
  process.exit(0);
}

run().catch(console.error);
