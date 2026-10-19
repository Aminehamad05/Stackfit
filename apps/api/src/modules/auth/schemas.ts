import { z } from 'zod';
import { emailSchema, passwordSchema } from '../../schemas/common.js';

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  // The name shown on the leaderboard is always typed by the user (no email fallback).
  displayName: z.string().trim().min(1).max(100),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
