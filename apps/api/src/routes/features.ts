import { Router, Request, Response } from 'express';
import { featureService, FeatureFlag } from '../services/features.service';

const router = Router();

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

router.post('/override', async (req: Request, res: Response) => {
  const { flag, enabled } = req.body;
  if (!flag) return res.status(400).json({ error: 'Flag name required' });
  await featureService.setOverride(flag, enabled);
  res.json({ flag, enabled, overridden: true });
});

router.post('/clear-override', async (req: Request, res: Response) => {
  const { flag } = req.body;
  if (!flag) return res.status(400).json({ error: 'Flag name required' });
  await featureService.clearOverride(flag);
  res.json({ flag, cleared: true });
});

export default router;
