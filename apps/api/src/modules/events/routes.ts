import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { idParam, paginationQuery } from '../../schemas/common.js';

const r = Router();

const eventsQuery = paginationQuery.extend({
  field: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
});

const clubBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  contactEmail: z.string().email().max(255).optional(),
});

const eventBody = z.object({
  title: z.string().min(1).max(300),
  type: z.enum(['hackathon', 'networking', 'meetup', 'conference']),
  city: z.string().max(100).optional(),
  country: z.string().min(1).max(100),
  location: z.string().max(300).optional(),
  description: z.string().max(10000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  url: z.string().url().max(500).optional(),
  fieldId: z.number().int().positive().optional(),
});

// AGENT_SPEC §6 — events + club portal. NOTE: poster→event AI extraction is
// DISABLED; organizers submit the manual form only (status='draft' until confirmed).
r.get('/clubs', validate({ query: paginationQuery }), (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

r.post('/clubs', validate({ body: clubBody }), (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

r.get('/clubs/:id/events', validate({ params: idParam }), (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

r.post('/clubs/:id/events', validate({ params: idParam, body: eventBody }), (_req, res) => {
  res.status(501).json({ error: 'not_implemented' });
});

r.get('/events', validate({ query: eventsQuery }), (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

r.get('/events/:id/ics', validate({ params: idParam }), (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

r.get('/events/:id/gcal-link', validate({ params: idParam }), (_req: Request, res: Response) => {
  res.status(501).json({ error: 'not_implemented' });
});

export default r;
