import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import redis from '../config/redis';
import { getOrganizationSettings } from './organization.service';
import { sendEmail } from '../config/mailer';

// Simple lightweight regex User-Agent parser to avoid external dependencies
export function parseUserAgent(ua: string) {
  const userAgentStr = ua || '';
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  let device = 'Desktop';

  if (/chrome|crios/i.test(userAgentStr)) {
    browser = 'Chrome';
  } else if (/safari/i.test(userAgentStr) && !/chrome|crios/i.test(userAgentStr)) {
    browser = 'Safari';
  } else if (/firefox|iceweasel/i.test(userAgentStr)) {
    browser = 'Firefox';
  } else if (/msie|trident/i.test(userAgentStr)) {
    browser = 'Internet Explorer';
  } else if (/edge|edg/i.test(userAgentStr)) {
    browser = 'Edge';
  }

  if (/iphone|ipad|ipod/i.test(userAgentStr)) {
    os = 'iOS';
    device = /ipad/i.test(userAgentStr) ? 'Tablet' : 'Mobile';
  } else if (/android/i.test(userAgentStr)) {
    os = 'Android';
    device = /tablet/i.test(userAgentStr) ? 'Tablet' : 'Mobile';
  } else if (/windows/i.test(userAgentStr)) {
    os = 'Windows';
  } else if (/macintosh/i.test(userAgentStr)) {
    os = 'macOS';
  } else if (/linux/i.test(userAgentStr)) {
    os = 'Linux';
  }

  return { browser, operatingSystem: os, deviceName: device };
}

// SHA256 helper for hashing refresh tokens
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Lockout check helpers (returns lockout end time, or null if not locked)
export async function checkFailedLoginLockout(email: string): Promise<Date | null> {
  const isRedisAvailable = redis.status === 'ready' || redis.status === 'connecting';
  if (isRedisAvailable) {
    const lockoutKey = `lockout:${email}`;
    const lockoutVal = await redis.get(lockoutKey);
    if (lockoutVal) {
      const ttl = await redis.ttl(lockoutKey);
      return new Date(Date.now() + ttl * 1000);
    }
  }
  return null;
}

// Track and register failed login attempts
export async function registerFailedLogin(email: string): Promise<{ locked: boolean; remainingAttempts: number }> {
  const isRedisAvailable = redis.status === 'ready' || redis.status === 'connecting';
  if (isRedisAvailable) {
    const attemptsKey = `login_attempts:${email}`;
    const attempts = await redis.incr(attemptsKey);
    
    // Set expiry if first attempt
    if (attempts === 1) {
      await redis.expire(attemptsKey, 15 * 60); // 15 mins
    }

    if (attempts >= 5) {
      await redis.set(`lockout:${email}`, 'true', 'EX', 15 * 60); // lock 15 mins
      await redis.del(attemptsKey); // Reset attempts count
      return { locked: true, remainingAttempts: 0 };
    }
    
    return { locked: false, remainingAttempts: 5 - attempts };
  }
  return { locked: false, remainingAttempts: 4 }; // Fallback
}

export async function clearFailedLogins(email: string): Promise<void> {
  const isRedisAvailable = redis.status === 'ready' || redis.status === 'connecting';
  if (isRedisAvailable) {
    await redis.del(`login_attempts:${email}`);
    await redis.del(`lockout:${email}`);
  }
}

const VALID_DUPLICATE_LOGIN_POLICIES = ['SINGLE_SESSION', 'LIMIT_3', 'UNLIMITED'] as const;
export type DuplicateLoginPolicy = (typeof VALID_DUPLICATE_LOGIN_POLICIES)[number];

// Resolves the effective concurrent-session policy. Source of truth is the
// admin-configurable OrganizationSettings.duplicateLoginPolicy (Organization
// Settings > Security in the UI), so this can be changed at runtime without
// a redeploy. DUPLICATE_LOGIN_POLICY in the environment is kept only as an
// optional infra-level override (e.g. a hard requirement from ops/compliance
// that shouldn't be changeable from the admin UI); it takes precedence when
// set. Falls back to SINGLE_SESSION — the industry-standard default for an
// internal collaboration tool that holds credentials to company data — if
// neither is a recognized value, rather than silently defaulting to the
// least-secure "unlimited" behavior.
export async function getDuplicateLoginPolicy(): Promise<DuplicateLoginPolicy> {
  const envOverride = process.env.DUPLICATE_LOGIN_POLICY?.toUpperCase();
  if (envOverride && (VALID_DUPLICATE_LOGIN_POLICIES as readonly string[]).includes(envOverride)) {
    return envOverride as DuplicateLoginPolicy;
  }

  const orgSettings = await getOrganizationSettings();
  const configured = (orgSettings.duplicateLoginPolicy || '').toUpperCase();
  if ((VALID_DUPLICATE_LOGIN_POLICIES as readonly string[]).includes(configured)) {
    return configured as DuplicateLoginPolicy;
  }

  return 'SINGLE_SESSION';
}

// Enforce the configured duplicate-session policy. Called right before a new
// session is created (see auth.controller.ts login/verify2fa/ssoCallback), so
// that under SINGLE_SESSION the same credentials can never be simultaneously
// authenticated in two different browsers/devices — the previous session is
// revoked (and, on its next request, rejected by auth.middleware.ts) the
// moment the new one is established.
export async function enforceDuplicateLoginPolicy(userId: string): Promise<void> {
  const policy = await getDuplicateLoginPolicy();
  if (policy === 'UNLIMITED') return;

  if (policy === 'SINGLE_SESSION') {
    // Revoke every other existing session — only the new login stays valid,
    // so the same credentials can't be active in more than one browser/device.
    await revokeSessions(
      { userId, isRevoked: false },
      'FORCE_OUT',
      'Signed out because your account was logged in from a new browser/device (single-session policy)'
    );
  } else if (policy === 'LIMIT_3') {
    const activeSessions = await prisma.session.findMany({
      where: { userId, isRevoked: false },
      orderBy: { lastActivity: 'asc' }, // Oldest first
    });
    if (activeSessions.length >= 3) {
      // Evict oldest session(s) to fit current new login (new login will make it 4 sessions, so we evict down to 2)
      const excessCount = activeSessions.length - 2; // Keep oldest 2 (room for current session)
      const toEvict = activeSessions.slice(0, excessCount);
      await Promise.all(
        toEvict.map((session) => revokeSession(session.sessionId, 'FORCE_OUT', 'Evicted under session limit policy'))
      );
    }
  }
}

// Session cache wrappers using Redis
export async function cacheSession(sessionId: string, sessionData: any, ttlSeconds: number) {
  const isRedisAvailable = redis.status === 'ready' || redis.status === 'connecting';
  if (isRedisAvailable) {
    await redis.set(`session:active:${sessionId}`, JSON.stringify(sessionData), 'EX', Math.max(1, Math.floor(ttlSeconds)));
  }
}

export async function getCachedSession(sessionId: string): Promise<any | null> {
  const isRedisAvailable = redis.status === 'ready' || redis.status === 'connecting';
  if (isRedisAvailable) {
    const data = await redis.get(`session:active:${sessionId}`);
    if (data) {
      return JSON.parse(data);
    }
  }
  return null;
}

export async function invalidateSessionCache(sessionId: string) {
  const isRedisAvailable = redis.status === 'ready' || redis.status === 'connecting';
  if (isRedisAvailable) {
    await redis.del(`session:active:${sessionId}`);
  }
}

// Revoke a specific session helper
export async function revokeSession(sessionId: string, reason: string, details?: string): Promise<void> {
  await prisma.session.update({
    where: { sessionId },
    data: {
      isRevoked: true,
      revokedReason: reason,
      logoutTime: new Date(),
    },
  });
  
  // Invalidate Redis cache
  await invalidateSessionCache(sessionId);
}

// Revokes every session matching `where`, and returns how many were
// revoked. This centralizes a pattern that was duplicated, near-verbatim,
// across roughly eight call sites — logoutAll, adminLogoutUser,
// adminLogoutAll, resetPassword, changePassword's logoutOthers,
// admin.controller.ts's toggleUserSuspension and toggleUserActive, and
// enforceDuplicateLoginPolicy above — each doing its own findMany()
// followed by a sequential `for (const s of sessions) { await
// revokeSession(...) }` loop.
//
// revokeSession is intentionally called per-session rather than a raw
// session.updateMany, so the Redis-cached copy authenticate() checks first
// gets invalidated too (see revokeSession above) — a plain updateMany would
// leave stale cached sessions valid until their TTL expires even though the
// Postgres row says revoked. That per-session requirement is real. What
// wasn't necessary is doing those N revocations one after another: each
// session's DB update + cache invalidation is independent of every other
// session's, so sequential awaiting bought no correctness, only latency —
// most severely in adminLogoutAll, which revokes every active session
// company-wide and was doing it one HTTP request at a time.
export async function revokeSessions(
  where: Prisma.SessionWhereInput,
  reason: string,
  details?: string
): Promise<number> {
  const sessions = await prisma.session.findMany({ where });
  await Promise.all(sessions.map((session) => revokeSession(session.sessionId, reason, details)));
  return sessions.length;
}

// Emails the user when a login comes from a browser/OS combination or IP
// address that isn't associated with any of their other sessions —
// standard "new sign-in" security alert (GitHub, Google, Slack all do
// this). Deliberately skipped on a user's very first-ever session (nothing
// to compare against yet, and everyone's first login would otherwise
// trigger a "new device" email on day one, which is just noise) and never
// blocks or delays login — it's fire-and-forget from the caller's
// perspective, same as the other post-login emails in auth.controller.ts.
export async function notifyIfNewDevice(
  userId: string,
  email: string,
  currentSessionId: string,
  browser: string,
  operatingSystem: string,
  location: string | null,
  ipAddress: string
): Promise<void> {
  try {
    const priorSessionCount = await prisma.session.count({
      where: { userId, sessionId: { not: currentSessionId } },
    });
    if (priorSessionCount === 0) return; // first-ever login, nothing to compare against

    const matchingPriorSession = await prisma.session.findFirst({
      where: {
        userId,
        sessionId: { not: currentSessionId },
        OR: [
          { browser, operatingSystem },
          { ipAddress },
        ],
      },
    });
    if (matchingPriorSession) return; // recognized device or network, nothing to flag

    const orgSettings = await getOrganizationSettings();
    const orgName = orgSettings.orgName || 'ConnectHub';
    const whenText = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    const locationText = location || 'an unknown location';

    await sendEmail(
      email,
      `${orgName} - New sign-in to your account`,
      `We noticed a new sign-in to your account from ${browser} on ${operatingSystem}, near ${locationText} (${ipAddress}), at ${whenText}. If this was you, no action is needed. If you don't recognize this activity, change your password immediately and sign out of all other sessions from Settings > Security.`,
      `<p>We noticed a new sign-in to your account:</p>
       <ul>
         <li><strong>Device:</strong> ${browser} on ${operatingSystem}</li>
         <li><strong>Location:</strong> ${locationText} (${ipAddress})</li>
         <li><strong>Time:</strong> ${whenText}</li>
       </ul>
       <p>If this was you, no action is needed.</p>
       <p>If you don't recognize this activity, change your password immediately and sign out of all other sessions from Settings &gt; Security.</p>`
    );
  } catch (err) {
    // Never let an alerting failure affect login itself.
    console.error('[notifyIfNewDevice] Failed to send new-device alert:', err);
  }
}
