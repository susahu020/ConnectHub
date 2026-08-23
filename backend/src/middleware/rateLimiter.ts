import { Request, Response, NextFunction } from 'express';
import redis from '../config/redis';

// Simple sliding window counter in memory for fallback
const memoryLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Generic factory backing both the global and the stricter auth limiter
 * below — same Redis-with-memory-fallback sliding window, parameterized by
 * key prefix, limit, and window so we don't duplicate the counting logic.
 */
const makeRateLimiter = (opts: { keyPrefix: string; limit: number; windowSeconds: number; message: string }) => {
  const { keyPrefix, limit, windowSeconds, message } = opts;
  const windowMs = windowSeconds * 1000;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip || 'unknown-ip';
    const isRedisAvailable = redis.status === 'ready' || redis.status === 'connecting';

    if (isRedisAvailable) {
      try {
        const key = `${keyPrefix}:${ip}`;
        const requests = await redis.incr(key);

        if (requests === 1) {
          await redis.expire(key, windowSeconds);
        }

        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - requests));

        if (requests > limit) {
          res.status(429).json({ message, code: 'RATE_LIMIT_EXCEEDED' });
          return;
        }
        next();
        return;
      } catch (err) {
        console.warn(`Redis rate limiter (${keyPrefix}) error, falling back to memory:`, err);
      }
    }

    // Memory fallback rate limiter
    const now = Date.now();
    const mapKey = `${keyPrefix}:${ip}`;
    const clientData = memoryLimitStore.get(mapKey);

    if (!clientData || now > clientData.resetTime) {
      memoryLimitStore.set(mapKey, { count: 1, resetTime: now + windowMs });
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', limit - 1);
      next();
    } else {
      clientData.count++;
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - clientData.count));

      if (clientData.count > limit) {
        res.status(429).json({ message, code: 'RATE_LIMIT_EXCEEDED' });
        return;
      }
      next();
    }
  };
};

// Baseline limiter applied to every API request.
export const rateLimiter = makeRateLimiter({
  keyPrefix: 'rate_limit',
  limit: 100,
  windowSeconds: 60,
  message: 'Too many requests. Please try again in 1 minute.',
});

// Stricter limiter for sensitive, unauthenticated-or-account-affecting auth
// endpoints (login, register, forgot-password, invite, contact form) where
// the global 100/min budget is far too generous for credential-guessing or
// spam abuse. Account-level lockout (see auth.controller.checkFailedLoginLockout)
// already limits attempts against a single account; this limits volume from
// a single IP across ANY account, including registration/invite spam.
export const authRateLimiter = makeRateLimiter({
  keyPrefix: 'auth_rate_limit',
  limit: 10,
  windowSeconds: 15 * 60,
  message: 'Too many attempts from this network. Please try again in 15 minutes.',
});

// File/media upload limiter — covers file uploads, new-version uploads, and
// avatar/cover/org-logo uploads. The global 100/min limiter allows enough
// volume for scripted repeated large uploads to exhaust storage/bandwidth,
// so this caps it separately per IP.
export const fileUploadRateLimiter = makeRateLimiter({
  keyPrefix: 'file_upload_rate_limit',
  limit: 30,
  windowSeconds: 10 * 60,
  message: 'Too many uploads from this network. Please try again in a few minutes.',
});

// File-processing limiter — covers OCR and watermark generation, which are
// per-request CPU/third-party-cost operations rather than simple storage
// writes, so they get a lower budget than plain uploads.
export const fileProcessingRateLimiter = makeRateLimiter({
  keyPrefix: 'file_processing_rate_limit',
  limit: 15,
  windowSeconds: 10 * 60,
  message: 'Too many file-processing requests from this network. Please try again in a few minutes.',
});
