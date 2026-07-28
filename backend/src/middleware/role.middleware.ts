import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { Role } from '@prisma/client';

export const authorize = (roles: Role[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required.' });
        return;
      }

      // Legacy role-gated routes (the admin panel, org settings, etc.) are
      // governed solely by the authoritative `role` enum. Custom RBAC roles
      // grant fine-grained module/action permissions via checkPermission —
      // they must never be able to widen access to these coarse gates just
      // because someone gave a custom role a name like "Admin" or "Manager".
      const isAuthorized = roles.includes(req.user.role);

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
