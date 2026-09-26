import { Router, type Request, type Response } from 'express';

const r = Router();

// Gamification ledger (append-only) + leaderboard view. Deterministic, no AI.
r.get('/leaderboard', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

export default r;
