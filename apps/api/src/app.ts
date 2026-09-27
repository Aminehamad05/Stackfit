import express, {
  type ErrorRequestHandler,
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { join } from 'node:path';
import cors from 'cors';
import morgan from 'morgan';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AiDisabledError } from './ai/index.js';

import auth from './modules/auth/routes.js';
import background from './modules/background/routes.js';
import matching from './modules/matching/routes.js';
import tasters from './modules/tasters/routes.js';
import roadmap from './modules/roadmap/routes.js';
import quiz from './modules/quiz/routes.js';
import interview from './modules/interview/routes.js';
import points from './modules/points/routes.js';
import events from './modules/events/routes.js';
import clubs from './modules/clubs/routes.js';
import growth from './modules/growth/routes.js';
import fields from './modules/fields/routes.js';
import dashboard from './modules/dashboard/routes.js';

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  app.get('/api/health', (_req: Request, res: Response) => res.json({ ok: true, aiEnabled: false }));

  // Vanilla JS test console (dev/QA only): open /console/test-console.html.
  // Served from apps/api/public (CWD-aware: repo root locally, /app in Docker).
  app.use('/console', express.static(join(process.cwd(), 'apps/api/public')));

  app.use('/api/auth', auth);
  app.use('/api', background);
  app.use('/api', matching);
  app.use('/api', tasters);
  app.use('/api', roadmap);
  app.use('/api', quiz);
  app.use('/api', interview);
  app.use('/api', points);
  // NOTE: clubs BEFORE events — both define /clubs/* paths and Express matches
  // in mount order. /clubs/login + /clubs/me/* must hit the club router first;
  // unmatched paths (GET /clubs, /clubs/:id/events) fall through to events.
  app.use('/api', clubs);
  app.use('/api', events);
  app.use('/api', growth);
  app.use('/api', fields);
  app.use('/api', dashboard);

  // 404 + typed error handler (must be last)
  app.use((_req: Request, res: Response) => res.status(404).json({ error: 'not_found' }));

  const errorHandler: ErrorRequestHandler = (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    if (err instanceof AiDisabledError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'validation_error', details: err.issues });
      return;
    }
    if (err instanceof PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        res.status(409).json({ error: 'conflict' });
        return;
      }
      if (err.code === 'P2025') {
        res.status(404).json({ error: 'not_found' });
        return;
      }
    }
    if (err instanceof SyntaxError && 'body' in (err as unknown as Record<string, unknown>)) {
      res.status(400).json({ error: 'invalid_json' });
      return;
    }
    console.error(err);
    const status =
      typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
        ? err.status
        : 500;
    const message = err instanceof Error ? err.message : 'internal_error';
    res.status(status).json({ error: status === 500 ? 'internal_error' : message });
  };
  app.use(errorHandler);

  return app;
}
