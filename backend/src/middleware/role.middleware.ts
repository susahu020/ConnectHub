import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { Role } from '@prisma/client';
import prisma from '../config/db';

export const authorize = (roles: Role[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required.' });
        return;
      }

      // Check legacy enum role
      let isAuthorized = roles.includes(req.user.role);

      // Check custom role name if present
      if (!isAuthorized && req.user.customRoleId) {
        const customRole = await prisma.customRole.findUnique({
          where: { id: req.user.customRoleId },
          select: { name: true },
        });
        if (customRole) {
          const roleNameUpper = customRole.name.toUpperCase() as Role;
          isAuthorized = roles.includes(roleNameUpper);
        }
      }

      if (!isAuthorized) {
        res.status(403).json({ message: 'Forbidden. Insufficient permissions.' });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
