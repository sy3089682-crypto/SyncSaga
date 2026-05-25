import { Router, Request, Response } from 'express';
import { metrics } from '../services/metrics.service';

const router = Router();

metrics.init();

router.get('/', async (_req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain');
  res.send(await metrics.getMetrics());
});

router.get('/json', async (_req: Request, res: Response) => {
  res.json(await metrics.getMetricsJSON());
});

router.get('/health', async (_req: Request, res: Response) => {
  res.json({
    metricsInitialized: true,
    timestamp: new Date().toISOString(),
  });
});

export default router;
