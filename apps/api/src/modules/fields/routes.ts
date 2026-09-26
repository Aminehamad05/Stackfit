import { Router, type NextFunction, type Request, type Response } from 'express';
import { prisma } from '../../prisma.js';

const r = Router();

// GET /api/fields — public catalogue (powers Networking filters + field pickers).
r.get('/fields', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const fields = await prisma.field.findMany({
      select: { id: true, slug: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
    res.json({ fields });
  } catch (e) {
    next(e);
  }
});

export default r;
