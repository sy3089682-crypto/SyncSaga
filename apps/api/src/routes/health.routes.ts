import { Router } from 'express';
import { redisService } from '../services/redis.service';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const startRedis = Date.now();
    await redisService.getCached('health_check');
    const redisLatency = Date.now() - startRedis;

    const startDb = Date.now();
    await supabase.from('profiles').select('id').limit(1);
    const dbLatency = Date.now() - startDb;

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      latency: {
        redis: redisLatency,
        database: dbLatency,
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Service unavailable'
    });
  }
});

export default router;
