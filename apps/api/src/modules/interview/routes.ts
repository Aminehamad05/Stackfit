import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { getAi } from '../../ai/index.js';
import { idParam } from '../../schemas/common.js';

const r = Router();

const startBody = z.object({ conceptId: z.number().int().positive() });
const messageBody = z.object({ text: z.string().min(1).max(5000) });

// AGENT_SPEC §6 + §7.4 — AI interview. DISABLED: getAi() throws AiDisabledError
// (503 ai_disabled, handled globally in app.ts) until the layer is re-enabled.
r.post('/interviews', validate({ body: startBody }), (_req: Request, res: Response) => {
  getAi('interview');
  res.status(501).json({ error: 'not_implemented' });
});

r.post(
  '/interviews/:id/message',
  validate({ params: idParam, body: messageBody }),
  (_req: Request, res: Response) => {
    getAi('interview');
    res.status(501).json({ error: 'not_implemented' });
  },
);

r.post('/interviews/:id/finish', validate({ params: idParam }), (_req: Request, res: Response) => {
  getAi('interview');
  res.status(501).json({ error: 'not_implemented' });
});

export default r;
