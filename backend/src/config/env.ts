import crypto from 'crypto';

/**
 * Centralized environment/secret handling.
 *
 * Previously, JWT_ACCESS_SECRET / JWT_REFRESH_SECRET fell back to hardcoded
 * strings ('default-local-jwt-access-secret-123456', etc.) in three separate
 * files. Anyone who has ever seen this codebase (public repo, npm package,
 * this chat) knows those strings, so if a deployment ever forgets to set the
 * real env vars, every access & refresh token it issues is forgeable.
 *
 * New behavior:
 *  - production: missing secrets are a fatal startup error (fail fast, don't
 *    silently issue forgeable tokens).
 *  - development: if unset, we generate a random secret ONCE per process
 *    start and warn loudly. Tokens just won't survive a restart, which is
 *    an acceptable dev-only tradeoff (a shared guessable default is not).
 */

const isProduction = process.env.NODE_ENV === 'production';

function resolveSecret(envVar: string): string {
  const value = process.env[envVar];
  if (value && value.trim().length > 0) {
    return value;
  }

  if (isProduction) {
    throw new Error(
      `FATAL: ${envVar} is not set. Refusing to start in production with no secret configured. ` +
      `Set ${envVar} in your environment (see backend/.env.example).`
    );
  }

  const generated = crypto.randomBytes(48).toString('hex');
  console.warn(
    `⚠️  ${envVar} is not set. Generated a random development-only secret for this process. ` +
    `Sessions will not survive a server restart. Set ${envVar} in backend/.env to avoid this.`
  );
  return generated;
}

export const JWT_ACCESS_SECRET = resolveSecret('JWT_ACCESS_SECRET');
export const JWT_REFRESH_SECRET = resolveSecret('JWT_REFRESH_SECRET');

export const IS_PRODUCTION = isProduction;
