import { z } from 'zod';
import { paginationQuery } from '../../schemas/common.js';

export const eventsQuery = paginationQuery.extend({
  field: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  from: z.string().datetime().optional(),
});

export const clubBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  contactEmail: z.string().email().max(255).optional(),
});

export const clubLoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

/** Club-submitted event form (manual portal; poster AI extraction disabled). */
export const eventBody = z.object({
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
  // Draft until the club confirms → approved (only approved rows are public).
  status: z.enum(['draft', 'approved']).default('draft'),
});

export const eventUpdateSchema = eventBody.partial();

export type EventInput = z.infer<typeof eventBody>;
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;
export type ClubLoginInput = z.infer<typeof clubLoginSchema>;
