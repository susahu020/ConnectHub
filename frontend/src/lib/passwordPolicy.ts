import { z } from 'zod';

// Mirrors the server-side policy in backend/src/utils/passwordPolicy.ts.
// This is a client-side convenience for immediate feedback — the server is
// still the source of truth and re-validates independently (including the
// common-password list and identity check, which aren't duplicated here).
export const PASSWORD_HINT = 'At least 8 characters, with at least 3 of: uppercase, lowercase, numbers, symbols.';

export const passwordZodSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((val) => {
    const classes = [/[a-z]/.test(val), /[A-Z]/.test(val), /[0-9]/.test(val), /[^a-zA-Z0-9]/.test(val)];
    return classes.filter(Boolean).length >= 3;
  }, 'Include at least 3 of: uppercase, lowercase, numbers, symbols');
