import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { User } from '@prisma/client';
import { getCachedSession, cacheSession } from '../services/session.service';

export interface AuthenticatedRequest extends Request {
  user?: User;
  sessionId?: string;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = '';

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      res.status(401).json({ message: 'Authentication required. No token provided.' });
      return;
    }

    // A. Decode and verify Access Token signature
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET || 'default-local-jwt-access-secret-123456'
    ) as {
      id: string;
      email: string;
      sessionId: string;
    };

    if (!decoded.sessionId) {
      res.status(401).json({ message: 'Session ID is missing from authorization token.' });
      return;
    }

    // B. High Performance Session Caching (Redis Bypass)
    let sessionData = await getCachedSession(decoded.sessionId);

    if (!sessionData) {
      // Redis Cache Miss -> Lookup in Postgres
      const session = await prisma.session.findUnique({
        where: { sessionId: decoded.sessionId },
      });

      if (!session || session.isRevoked || session.expiresAt < new Date()) {
        res.status(401).json({ message: 'Session expired or revoked.', code: 'SESSION_REVOKED' });
        return;
      }

      sessionData = {
        userId: session.userId,
        accessTokenVersion: session.accessTokenVersion,
        expiresAt: session.expiresAt.getTime(),
      };

      // Set Redis Cache
      const ttlSeconds = (session.expiresAt.getTime() - Date.now()) / 1000;
      await cacheSession(decoded.sessionId, sessionData, ttlSeconds);
    } else {
      // Redis Cache Hit -> Verify Expiration
      if (sessionData.expiresAt < Date.now()) {
        res.status(401).json({ message: 'Session expired.', code: 'SESSION_REVOKED' });
        return;
      }
    }

    // C. Fetch current User details (verifies role, verification status, and block state)
    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      include: { settings: true },
    });

    if (!user) {
      res.status(401).json({ message: 'User profile not found or session invalid.' });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({ message: 'Email address not verified.', code: 'USER_NOT_VERIFIED' });
      return;
    }

    // Bind session context to request object
    req.user = user;
    req.sessionId = decoded.sessionId;
    
    // Track user activity asynchronously (debounced database write)
    const { trackActivity } = require('./activity.middleware');
    trackActivity(req, res, () => {}).catch((err: any) => console.error('Activity track error:', err));

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Access token expired.', code: 'TOKEN_EXPIRED' });
      return;
    }
    res.status(401).json({ message: 'Invalid authentication token.' });
  }
};

// Same verification as `authenticate`, but never blocks the request — attaches
// req.user when a valid token is present, otherwise just calls next(). Used for
// endpoints that must work for anonymous callers by default, but can layer on
// extra restrictions when the caller happens to be signed in (e.g. a file share
// link that's public unless it was scoped to specific people).
export const optionalAuthenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = '';

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      next();
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET || 'default-local-jwt-access-secret-123456'
    ) as { id: string; email: string; sessionId: string };

    if (!decoded.sessionId) {
      next();
      return;
    }

    let sessionData = await getCachedSession(decoded.sessionId);

    if (!sessionData) {
      const session = await prisma.session.findUnique({ where: { sessionId: decoded.sessionId } });
      if (!session || session.isRevoked || session.expiresAt < new Date()) {
        next();
        return;
      }
      sessionData = {
        userId: session.userId,
        accessTokenVersion: session.accessTokenVersion,
        expiresAt: session.expiresAt.getTime(),
      };
      const ttlSeconds = (session.expiresAt.getTime() - Date.now()) / 1000;
      await cacheSession(decoded.sessionId, sessionData, ttlSeconds);
    } else if (sessionData.expiresAt < Date.now()) {
      next();
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: sessionData.userId } });
    if (user && user.isVerified) {
      req.user = user;
      req.sessionId = decoded.sessionId;
    }

    next();
  } catch {
    // Any decode/verify failure just means "treat as anonymous" here, unlike
    // `authenticate`, which rejects the request outright.
    next();
  }
};
