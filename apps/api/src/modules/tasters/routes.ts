import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { idParam, tasterIdParam } from '../../schemas/common.js';

const r = Router();

const submitBody = z.object({
  submissionUrl: z.string().url().max(500).optional(),
  submissionText: z.string().max(20000).optional(),
  enjoyment: z.number().int().min(1).max(5),
  difficulty: z.number().int().min(1).max(5),
  wouldContinue: z.boolean(),
  reflection: z.string().max(20000).optional(),
});

// AGENT_SPEC §6 — tasters. NOTE: AI review on submit is DISABLED (ai/ stub
// returns 503). Until re-enabled, submit persists reflection + enjoyment and
// performance stays null; fitScore() treats the field as "not tried yet".
r.get('/fields/:id/taster', validate({ params: idParam }), (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

r.post(
  '/users/me/tasters/:tasterId/start',
  validate({ params: tasterIdParam }),
  (_req: Request, res: Response) => {
    res.status(501).json({ error: 'not_implemented' });
  },
);

r.post(
  '/users/me/tasters/:tasterId/submit',
  validate({ params: tasterIdParam, body: submitBody }),
  (_req: Request, res: Response) => {
    res.status(501).json({ error: 'not_implemented' });
  },
);

export default r;
