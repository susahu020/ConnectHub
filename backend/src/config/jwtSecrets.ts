// Single source of truth for the JWT signing secrets.
//
// Previously the same fallback literal ('default-local-jwt-access-secret-123456')
// was copy-pasted across auth.controller.ts, auth.middleware.ts, socket.service.ts,
// and sso.service.ts. That's harmless today only because validateEnv.ts refuses to
// boot in production without a real secret — but six independent copies of a
// "default secret" string is exactly the kind of thing that's easy to update in
// five places and miss the sixth. Centralizing it here means there is now exactly
// one fallback value to ever reason about, and one place to change if the fallback
// strategy itself changes (e.g. to fail closed even in development).
//
// validateEnv.ts's KNOWN_PLACEHOLDER_VALUES set still hardcodes these same two
// strings (deliberately — it's a security check and shouldn't trust this module
// not to have been tampered with), so if you change the fallback values here,
// update KNOWN_PLACEHOLDER_VALUES in validateEnv.ts to match, or the startup
// check will stop recognizing an unconfigured deployment.
export const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'default-local-jwt-access-secret-123456';

export const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'default-local-jwt-refresh-secret-123456';
