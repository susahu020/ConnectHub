import { z } from 'zod';

/**
 * Company-wide password policy. Applied everywhere a password is set:
 * registration, forgot-password reset, self-service change, admin-forced
 * reset, and invite-onboarding. Previously each of those five call sites
 * either had no check at all or just `.length >= 6` — this is the one
 * place that decides what "strong enough" means, so every entry point
 * gets to stay in sync automatically.
 *
 * Rules (roughly NIST 800-63B length-first guidance, plus the character-class
 * mix most enterprise IT policies still expect for compliance purposes):
 *   - At least 8 characters
 *   - At least 3 of the 4 character classes (uppercase, lowercase, digit, symbol)
 *   - Not on the common/breached password list
 *   - Not a trivial sequential or single-character-repeated string
 */

const MIN_LENGTH = 8;

// A short, deliberately-curated list of the passwords that show up at the
// top of every public breach-corpus frequency list. This isn't a substitute
// for a full breach-database check (e.g. HaveIBeenPwned's k-anonymity API),
// which would need outbound network access from the server — this catches
// the most common, laziest choices without that dependency.
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
  'qwerty123', 'qwertyuiop', 'letmein123', 'welcome123', 'admin1234', 'admin123',
  'iloveyou1', 'monkey123', 'football1', 'baseball1', 'dragon123', 'master123',
  'sunshine1', 'princess1', 'trustno1', 'superman1', 'starwars1', 'whatever1',
  'passw0rd', 'p@ssw0rd', 'p@ssword', 'changeme1', 'letmein1', 'abc123456',
  '11111111', '00000000', 'zaq12wsx', 'qazwsx123',
]);

const isSequential = (password: string): boolean => {
  const lower = password.toLowerCase();
  const sequences = ['abcdefgh', 'bcdefghi', 'cdefghij', '01234567', '12345678', '23456789', 'qwertyui', 'asdfghjk'];
  if (sequences.some((seq) => lower.includes(seq))) return true;
  if (new Set(password).size === 1) return true; // "aaaaaaaa"
  return false;
};

export interface PasswordCheckResult {
  valid: boolean;
  message?: string;
}

export const checkPasswordStrength = (password: string): PasswordCheckResult => {
  if (!password || password.length < MIN_LENGTH) {
    return { valid: false, message: `Password must be at least ${MIN_LENGTH} characters.` };
  }

  const classes = [
    /[a-z]/.test(password), // lowercase
    /[A-Z]/.test(password), // uppercase
    /[0-9]/.test(password), // digit
    /[^a-zA-Z0-9]/.test(password), // symbol
  ];
  const classCount = classes.filter(Boolean).length;
  if (classCount < 3) {
    return {
      valid: false,
      message: 'Password must include at least 3 of the following: uppercase letters, lowercase letters, numbers, and symbols.',
    };
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, message: 'This password is too common. Please choose something more unique.' };
  }

  if (isSequential(password)) {
    return { valid: false, message: 'Password is too predictable (sequential or repeated characters). Please choose something more unique.' };
  }

  return { valid: true };
};

/**
 * Extra context-aware check for call sites that know the account's identity
 * (email/name) — rejects passwords that are trivially derived from the
 * person's own identity (e.g. "JohnSmith2024", "john.doe@company"). Zod
 * schemas run before a user record necessarily exists/is loaded, so this is
 * applied separately, inline in the relevant controllers, not as part of the
 * zod schema below.
 */
export const checkPasswordAgainstIdentity = (
  password: string,
  identity: { email?: string | null; firstName?: string | null; lastName?: string | null }
): PasswordCheckResult => {
  const lowerPassword = password.toLowerCase();
  const candidates = [
    identity.email?.split('@')[0],
    identity.firstName,
    identity.lastName,
  ].filter((c): c is string => !!c && c.length >= 3);

  for (const candidate of candidates) {
    if (lowerPassword.includes(candidate.toLowerCase())) {
      return { valid: false, message: 'Password should not contain your name or email address.' };
    }
  }
  return { valid: true };
};

// Zod-level enforcement for schemas that don't have profile context
// (registration, reset-password) — the identity check above is layered on
// top of this, inline, in controllers that do have that context.
export const strongPasswordZod = z
  .string()
  .superRefine((val, ctx) => {
    const result = checkPasswordStrength(val);
    if (!result.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.message });
    }
  });
