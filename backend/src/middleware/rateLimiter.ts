import { Request, Response, NextFunction } from 'express';
import redis from '../config/redis';

// Simple sliding window counter in memory for fallback
const memoryLimitStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const ip = req.ip || 'unknown-ip';
  const limit = 100; // 100 requests
  const windowMs = 60 * 1000; // per 1 minute

  const isRedisAvailable = redis.status === 'ready' || redis.status === 'connecting';

  if (isRedisAvailable) {
    try {
      const key = `rate_limit:${ip}`;
      const requests = await redis.incr(key);

      if (requests === 1) {
        await redis.expire(key, 60); // 1 minute expiration
      }

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - requests));

      if (requests > limit) {
        res.status(429).json({
          message: 'Too many requests. Please try again in 1 minute.',
          code: 'RATE_LIMIT_EXCEEDED',
        });
        return;
      }
      next();
      return;
    } catch (err) {
      console.warn('Redis rate limiter error, falling back to memory:', err);
    }
  }

  // Memory fallback rate limiter
  const now = Date.now();
  const clientData = memoryLimitStore.get(ip);

  if (!clientData || now > clientData.resetTime) {
    memoryLimitStore.set(ip, {
      count: 1,
      resetTime: now + windowMs,
    });
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', limit - 1);
    next();
  } else {
    clientData.count++;
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - clientData.count));

    if (clientData.count > limit) {
      res.status(429).json({
        message: 'Too many requests. Please try again in 1 minute.',
        code: 'RATE_LIMIT_EXCEEDED',
      });
      return;
    }
    next();
  }
};
