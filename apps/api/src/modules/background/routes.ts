import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';

const r = Router();

const backgroundBody = z.object({
  items: z
    .array(
      z.object({
        itemId: z.number().int().positive(),
        confidence: z.number().int().min(1).max(5),
        interest: z.number().int().min(1).max(5),
      }),
    )
    .min(1),
});

// AGENT_SPEC §6 — background (deterministic; no AI involved)
r.get('/background-items', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

r.post('/users/me/background', validate({ body: backgroundBody }), (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

export default r;
