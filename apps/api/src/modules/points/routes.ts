import { Router, type Request, type Response } from 'express';
import { prisma } from '../../prisma.js';
import { requireAuth } from '../../middleware/auth.js';

const r = Router();

interface LeaderboardRow {
  id: bigint;
  display_name: string;
  total_points: number;
}

// GET /api/leaderboard — ranked total points from the leaderboard view.
// Deterministic, no AI.
r.get(
  '/leaderboard',
  requireAuth,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = (await prisma.$queryRawUnsafe(
      'SELECT id, display_name, total_points FROM leaderboard',
    )) as LeaderboardRow[];
    res.json({
      leaderboard: rows.map((row) => ({
        id: Number(row.id),
        display_name: row.display_name,
        total_points: Number(row.total_points),
      })),
    });
  },
);

export default r;
