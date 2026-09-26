import { Router, type Request, type Response } from 'express';
import { validate } from '../../middleware/validate.js';
import { idParam } from '../../schemas/common.js';

const r = Router();

// AGENT_SPEC §6 — roadmap (buildRoadmap output, persisted). Deterministic, no AI.
r.get('/roadmaps/:id', validate({ params: idParam }), (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

export default r;
