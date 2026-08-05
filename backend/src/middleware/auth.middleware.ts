import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { User } from '@prisma/client';
import { getCachedSession, cacheSession } from '../services/session.service';
import { getOrganizationSettings } from '../services/organization.service';

// Endpoints that must stay reachable for a user who hasn't set up 2FA yet
// even when the organization requires it — otherwise a user with MFA_SETUP_
// REQUIRED could never load the very screen that lets them satisfy it, or
// sign out and try a different account. Paths are router-relative (this
// router is mounted at /api/v1 in index.ts, so req.path here excludes that
// prefix).
const MFA_SETUP_ALLOWLIST = new Set([
  '/auth/2fa/setup',
  '/auth/2fa/activate',
  '/auth/logout',
  '/users/profile',
]);

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

    if (user.isSuspended) {
      res.status(403).json({ message: 'Your account has been suspended. Contact your administrator.', code: 'USER_SUSPENDED' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: 'Your account is inactive. Contact your administrator.', code: 'USER_INACTIVE' });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({ message: 'Email address not verified.', code: 'USER_NOT_VERIFIED' });
      return;
    }

    // Time-bound role elevation: a custom role assignment can carry an
    // expiresAt (set via rbac.controller.ts's assignRole). Checked lazily
    // here — the single choke point every authenticated request already
    // passes through — rather than a background job: the first request
    // after expiry clears it, logs it, and the user falls back to their
    // base permissions immediately, no cron/worker needed.
    if (user.customRoleId && user.customRoleExpiresAt && user.customRoleExpiresAt < new Date()) {
      const expiredRoleId = user.customRoleId;
      await prisma.user.update({
        where: { id: user.id },
        data: { customRoleId: null, customRoleExpiresAt: null },
      });
      await prisma.auditLog.create({
        data: {
          action: 'ROLE_EXPIRED',
          details: `Temporary role assignment (role ${expiredRoleId}) for ${user.email} expired and was automatically revoked.`,
        },
      });
      user.customRoleId = null;
      user.customRoleExpiresAt = null;
      // Let this user's own other open tabs/sessions know immediately,
      // same event assignRole itself pushes on a manual change.
      req.app.get('io')?.to(`user:${user.id}`).emit('role_assignment_updated', {
        customRoleId: null,
        roleName: '',
        permissions: {},
      });
    }

    // Org-wide MFA enforcement (Organization Settings > Security). Blocks
    // everything except the handful of endpoints needed to view your own
    // name/email, set up 2FA, or log out — not a full lockout, just no
    // access to the rest of the app until 2FA is on.
    if (!user.twoFactorEnabled && !MFA_SETUP_ALLOWLIST.has(req.path)) {
      const orgSettings = await getOrganizationSettings();
      if (orgSettings.mfaRequired) {
        res.status(403).json({
          message: 'Your organization requires two-factor authentication. Please set it up to continue.',
          code: 'MFA_SETUP_REQUIRED',
        });
        return;
      }
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
    if (user && user.isVerified && !user.isSuspended && user.isActive) {
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
