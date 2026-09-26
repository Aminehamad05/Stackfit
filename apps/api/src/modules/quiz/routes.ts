import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { idParam } from '../../schemas/common.js';

const r = Router();

const attemptBody = z.object({
  answers: z.array(z.object({ questionId: z.number().int().positive(), optionId: z.number().int().positive() })).min(1),
});

// AGENT_SPEC §6 — quiz gate over live_questions only. Deterministic grading, no AI.
r.get('/concepts/:id/quiz', requireAuth, validate({ params: idParam }), (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

r.post(
  '/concepts/:id/quiz/attempt',
  requireAuth,
  validate({ params: idParam, body: attemptBody }),
  (_req: Request, res: Response) => {
    res.status(501).json({ error: 'not_implemented' });
  },
);

export default r;
