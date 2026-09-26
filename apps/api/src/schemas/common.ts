import { z } from 'zod';

/** Shared Zod primitives — import from feature `schemas.ts` files, don't redefine. */
export const idParam = z.object({
  id: z.coerce.number().int().positive(),
});

export const tasterIdParam = z.object({
  tasterId: z.coerce.number().int().positive(),
});

export const conceptIdParam = z.object({
  id: z.coerce.number().int().positive(),
});

export const paginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const emailSchema = z.string().email().max(255);
export const passwordSchema = z.string().min(8).max(128);
