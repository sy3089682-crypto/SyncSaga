import { Router, Request, Response } from 'express';
import { featureService, FeatureFlag } from '../services/features.service';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * Feature Flag Routes
 *
 * GET / and GET /:flag are public (feature flags are not secret).
 * POST /override and POST /clear-override require authentication
 * and should be restricted to admin users in production.
 */

router.get('/', async (_req: Request, res: Response) => {
  const features = await featureService.getFeatureList();
  res.json({ features });
});

router.get('/:flag', async (req: Request, res: Response) => {
  const flag = req.params.flag as FeatureFlag;
  const enabled = await featureService.isEnabled(flag);
  const config = featureService.getFlagConfig(flag);
  res.json({ flag, enabled, description: config?.description });
});

// Protected routes — require auth for flag overrides
router.post('/override', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { flag, enabled } = req.body;
  if (!flag) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Flag name required' } });
  if (typeof enabled !== 'boolean') return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'enabled must be boolean' } });
  await featureService.setOverride(flag, enabled);
  res.json({ flag, enabled, overridden: true });
});

router.post('/clear-override', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { flag } = req.body;
  if (!flag) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Flag name required' } });
  await featureService.clearOverride(flag);
  res.json({ flag, cleared: true });
});

export default router;
