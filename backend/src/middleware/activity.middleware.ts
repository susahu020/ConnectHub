import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from './auth.middleware';
import { cacheSession } from '../services/session.service';

export const trackActivity = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const sessionId = req.sessionId;

    if (userId && sessionId) {
      const now = new Date();
      
      // Debounce database activity writes (only write if lastActivity is older than 5 minutes)
      const session = await prisma.session.findUnique({
        where: { sessionId },
      });

      if (session && !session.isRevoked) {
        const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
        
        if (timeSinceLastActivity > 5 * 60 * 1000) { // 5 minutes debounce
          // Update PostgreSQL
          await prisma.session.update({
            where: { sessionId },
            data: { lastActivity: now },
          });

          // Update Redis Cache
          const ttlSeconds = (session.expiresAt.getTime() - now.getTime()) / 1000;
          await cacheSession(sessionId, {
            userId,
            accessTokenVersion: session.accessTokenVersion,
            expiresAt: session.expiresAt.getTime(),
          }, ttlSeconds);
        }
      }
    }
  } catch (err) {
    console.error('Failed to update activity status in middleware:', err);
  }
  
  next();
};
