import { z } from 'zod';

// Mirrors the server-side policy in backend/src/utils/passwordPolicy.ts.
// This is a client-side convenience for immediate feedback — the server is
// still the source of truth and re-validates independently (including the
// common-password list and identity check, which aren't duplicated here).
export const PASSWORD_HINT = 'At least 8 characters, with at least 3 of: uppercase, lowercase, numbers, symbols.';

export const MIN_PASSWORD_LENGTH = 8;

export const passwordZodSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((val) => {
    const classes = [/[a-z]/.test(val), /[A-Z]/.test(val), /[0-9]/.test(val), /[^a-zA-Z0-9]/.test(val)];
    return classes.filter(Boolean).length >= 3;
  }, 'Include at least 3 of: uppercase, lowercase, numbers, symbols');

// A tiny slice of the server's COMMON_PASSWORDS list (backend/src/utils/
// passwordPolicy.ts), just enough to give live "too common" feedback while
// typing. Deliberately not the full list and not a substitute for the
// server check — the server re-validates against its own full list
// regardless of what this says, this is UX-only.
const OBVIOUSLY_COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789',
  'qwerty123', 'letmein123', 'welcome123', 'admin123', 'iloveyou1',
]);

const isSequentialOrRepeated = (password: string): boolean => {
  const lower = password.toLowerCase();
  const sequences = ['abcdefgh', 'bcdefghi', '01234567', '12345678', 'qwertyui', 'asdfghjk'];
  if (sequences.some((seq) => lower.includes(seq))) return true;
  if (password.length > 0 && new Set(password).size === 1) return true; // "aaaaaaaa"
  return false;
};

export interface PasswordRuleCheck {
  key: string;
  label: string;
  met: boolean;
}

export type PasswordStrengthLabel = 'Too weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';

export interface PasswordStrengthResult {
  /** 0–4 */
  score: number;
  label: PasswordStrengthLabel;
  rules: PasswordRuleCheck[];
  /** True once every rule the server also enforces is satisfied. */
  meetsPolicy: boolean;
}

// Live, granular breakdown for a visual strength meter / checklist — used
// wherever someone is choosing a new password (registration, invite
// onboarding, password reset, self-service change), so they get real-time
// feedback instead of only finding out a password is too weak/common after
// submitting the form and getting a 400 back.
export function getPasswordStrength(password: string): PasswordStrengthResult {
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const classCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  const hasMinLength = password.length >= MIN_PASSWORD_LENGTH;
  const hasClassMix = classCount >= 3;
  const notCommon = password.length === 0 || !OBVIOUSLY_COMMON_PASSWORDS.has(password.toLowerCase());
  const notPredictable = password.length === 0 || !isSequentialOrRepeated(password);

  const rules: PasswordRuleCheck[] = [
    { key: 'length', label: `At least ${MIN_PASSWORD_LENGTH} characters`, met: hasMinLength },
    { key: 'classMix', label: '3 of: uppercase, lowercase, number, symbol', met: hasClassMix },
    { key: 'notCommon', label: 'Not a commonly used password', met: notCommon },
    { key: 'notPredictable', label: 'No repeated or sequential characters', met: notPredictable },
  ];

  const meetsPolicy = rules.every((r) => r.met);

  // Score is deliberately gated on the hard policy rules first (a long,
  // varied, but common/sequential password still scores low) then adds
  // credit for length/variety beyond the minimum, so the bar keeps moving
  // for a user who's already past the minimum bar instead of maxing out
  // the instant they clear it.
  let score = 0;
  if (password.length > 0) {
    if (hasMinLength) score += 1;
    if (hasClassMix) score += 1;
    if (notCommon && notPredictable) score += 1;
    if (password.length >= 12 && classCount === 4) score += 1;
  }

  const labels: PasswordStrengthLabel[] = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];

  return {
    score,
    label: labels[score],
    rules,
    meetsPolicy,
  };
}
