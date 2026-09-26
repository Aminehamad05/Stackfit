import { z } from 'zod';
import { emailSchema, passwordSchema } from '../../schemas/common.js';

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
