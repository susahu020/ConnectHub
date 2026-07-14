import crypto from 'crypto';
import prisma from '../config/db';
import redis from '../config/redis';

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

// Enforce configureable duplicate session limits
export async function enforceDuplicateLoginPolicy(userId: string): Promise<void> {
  // Mode configuration: "unlimited", "limit-3", "single"
  const policy = process.env.DUPLICATE_LOGIN_POLICY || 'unlimited';
  if (policy === 'unlimited') return;

  const activeSessions = await prisma.session.findMany({
    where: { userId, isRevoked: false },
    orderBy: { lastActivity: 'asc' }, // Oldest first
  });

  if (policy === 'single' && activeSessions.length > 0) {
    // Revoke all existing sessions
    for (const session of activeSessions) {
      await revokeSession(session.sessionId, 'FORCE_OUT', 'New login established on single-device policy');
    }
  } else if (policy === 'limit-3' && activeSessions.length >= 3) {
    // Evict oldest session to fit current new login (new login will make it 4 sessions, so we evict oldest 1)
    const excessCount = activeSessions.length - 2; // Keep oldest 2 (room for current session)
    for (let i = 0; i < excessCount; i++) {
      if (activeSessions[i]) {
        await revokeSession(activeSessions[i].sessionId, 'FORCE_OUT', 'Evicted under session limit policy');
      }
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
