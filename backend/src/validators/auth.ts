import { z } from 'zod';

const identifier = z.string().trim().min(5).max(120);
const kind = z.enum(['phone', 'email']);
const norm = (v: string, k: 'phone' | 'email') => (k === 'email' ? v.toLowerCase() : v.replace(/[\s-]/g, ''));
const device = { deviceName: z.string().max(80).optional(), platform: z.string().max(20).optional() };

export const requestOtpSchema = z.object({ identifier, kind }).transform((d) => ({ ...d, identifier: norm(d.identifier, d.kind) }));
export const registerSchema = z.object({
  identifier, kind, code: z.string().length(6),
  dateOfBirth: z.coerce.date(), ageConfirmed: z.literal(true),
  managedBy: z.enum(['self', 'parent', 'family']).default('self'), ...device,
}).transform((d) => ({ ...d, identifier: norm(d.identifier, d.kind) }));
export const loginSchema = z.object({ identifier, kind, code: z.string().length(6), ...device })
  .transform((d) => ({ ...d, identifier: norm(d.identifier, d.kind) }));
export const refreshSchema = z.object({ refreshToken: z.string().min(10) });
