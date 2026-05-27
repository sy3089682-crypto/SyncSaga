import { Router, Request, Response } from 'express';
import { metrics } from '../services/metrics.service';
import { getAiRouter } from '../services/ai.service';
import { providerHealth } from '../lib/ai/router/provider-health';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const systemMetrics = await metrics.getMetrics();
  const aiHealth = getAiRouter().isAvailable() ? providerHealth.getStats() : {};

  res.json({
    ...systemMetrics,
    ai: {
      providers: aiHealth,
      available: getAiRouter().isAvailable(),
      groq: getAiRouter().hasProvider('groq'),
      gemini: getAiRouter().hasProvider('gemini'),
      cloudflare: getAiRouter().hasProvider('cloudflare'),
    },
  });
});

export default router;
