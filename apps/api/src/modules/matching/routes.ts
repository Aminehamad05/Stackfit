import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';

const r = Router();

const fieldChoiceBody = z.object({ fieldId: z.number().int().positive() });

// AGENT_SPEC §4 + §6 — pure deterministic matching (matching.ts). The LLM only
// ever writes the "why this fits" text, and that path is disabled (see ai/).
r.post('/users/me/field-matches/compute', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

r.get('/users/me/field-matches', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

r.get('/users/me/field-fit', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

r.post('/users/me/field-choice', validate({ body: fieldChoiceBody }), (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

export default r;
