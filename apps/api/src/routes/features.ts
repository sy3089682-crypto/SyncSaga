import { Router, Request, Response } from 'express';
import { featureService, FeatureFlag } from '../services/features.service';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({ features: featureService.getFeatureList() });
});

router.get('/:flag', (req: Request, res: Response) => {
  const flag = req.params.flag as FeatureFlag;
  const enabled = featureService.isEnabled(flag);
  res.json({ flag, enabled });
});

router.post('/override', (req: Request, res: Response) => {
  const { flag, enabled } = req.body;
  if (!flag) return res.status(400).json({ error: 'Flag name required' });
  featureService.setOverride(flag, enabled);
  res.json({ flag, enabled, overridden: true });
});

router.post('/clear-override', (req: Request, res: Response) => {
  const { flag } = req.body;
  if (!flag) return res.status(400).json({ error: 'Flag name required' });
  featureService.clearOverride(flag);
  res.json({ flag, cleared: true });
});

export default router;
